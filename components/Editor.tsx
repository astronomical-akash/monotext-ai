import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon, Sparkles, Save, Type, Heading1, Heading2, Loader2, Download, X, Replace, Eye, EyeOff, Sigma } from 'lucide-react';
import { formatTextWithGemini, generateContextualContent, generateLatexFromText } from '../services/geminiService';
import { Note, EditorSettings } from '../types';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface EditorProps {
    note: Note;
    onUpdate: (id: string, title: string, content: string) => void;
    onBack: () => void;
    settings: EditorSettings;
}

type AiLength = 'short' | 'medium' | 'long';
type AiStep = 'input' | 'generating' | 'review';

const Editor: React.FC<EditorProps> = ({ note, onUpdate, onBack, settings }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [title, setTitle] = useState(note.title);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSaved, setLastSaved] = useState<number | null>(null);

    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiLength, setAiLength] = useState<AiLength>('medium');
    const [aiStep, setAiStep] = useState<AiStep>('input');
    const [generatedPreview, setGeneratedPreview] = useState('');
    const savedRange = useRef<Range | null>(null);

    // Find & Replace State
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [findTerm, setFindTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');

    // Preview Mode State (for LaTeX)
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const rawContentBeforePreview = useRef<string>('');

    // LaTeX Modal State
    const [showLatexModal, setShowLatexModal] = useState(false);
    const [latexQuery, setLatexQuery] = useState('');
    const [latexGenerating, setLatexGenerating] = useState(false);
    const savedLatexRange = useRef<Range | null>(null);

    // Sync initial content
    useEffect(() => {
        // We only update innerHTML if it has changed significantly and we aren't typing
        // OR if we switched notes.
        if (contentRef.current && note.id !== contentRef.current.getAttribute('data-note-id')) {
            contentRef.current.innerHTML = note.content;
            contentRef.current.setAttribute('data-note-id', note.id);
            setIsPreviewMode(false);
        }
    }, [note.id]);

    // Apply settings to CSS variables
    const editorStyles = {
        '--editor-h1-size': `${settings.h1Size}px`,
        '--editor-h2-size': `${settings.h2Size}px`,
        '--editor-p-size': `${settings.pSize}px`
    } as React.CSSProperties;

    const handleCommand = (command: string, value: string | undefined = undefined) => {
        if (isPreviewMode) return;
        document.execCommand(command, false, value);
        contentRef.current?.focus();
        triggerUpdate();
    };

    const triggerUpdate = () => {
        if (contentRef.current && !isPreviewMode) {
            onUpdate(note.id, title, contentRef.current.innerHTML);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isPreviewMode) return;

        // Intercept '@' key
        if (e.key === '@') {
            e.preventDefault(); // Prevent the '@' from being typed

            // Save the current cursor position
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                savedRange.current = selection.getRangeAt(0).cloneRange();
            }

            // Open the dialog
            setAiQuery('');
            setAiLength('medium');
            setAiStep('input');
            setGeneratedPreview('');
            setShowAiModal(true);
        }
    };

    const handleAiGeneration = async () => {
        if (!aiQuery.trim()) return;

        setAiStep('generating');
        try {
            const contextText = contentRef.current?.innerText || "";
            const generatedContent = await generateContextualContent(aiQuery, contextText, aiLength);
            setGeneratedPreview(generatedContent);
            setAiStep('review');
        } catch (error) {
            alert("Failed to generate content. Please try again.");
            setAiStep('input');
        }
    };

    const handleInsertAiContent = () => {
        if (savedRange.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRange.current);

                // Insert the generated HTML wrapped in a highlight span
                const htmlToInsert = `<span class="ai-highlight">${generatedPreview}</span>&nbsp;`;
                document.execCommand('insertHTML', false, htmlToInsert);
                triggerUpdate();
            }
        }
        setShowAiModal(false);
    };

    const handleTogglePreview = () => {
        if (!contentRef.current) return;

        if (!isPreviewMode) {
            // Switch to Preview: Save raw HTML, then render LaTeX
            rawContentBeforePreview.current = contentRef.current.innerHTML;
            setIsPreviewMode(true);

            // Defer rendering to ensure state update has processed
            setTimeout(() => {
                if (!contentRef.current) return;

                try {
                    // Walk through all text nodes and render LaTeX
                    const walker = document.createTreeWalker(
                        contentRef.current,
                        NodeFilter.SHOW_TEXT,
                        null
                    );

                    const nodesToReplace: Array<{ node: Node, parent: Node, html: string }> = [];
                    let node = walker.nextNode();

                    while (node) {
                        const text = node.textContent || '';

                        // Check if this text node contains LaTeX delimiters
                        if (text.includes('$')) {
                            const parent = node.parentNode;
                            if (parent) {
                                // Process the text to find and render LaTeX
                                const processedHtml = processLatexInText(text);
                                if (processedHtml !== text) {
                                    nodesToReplace.push({ node, parent, html: processedHtml });
                                }
                            }
                        }
                        node = walker.nextNode();
                    }

                    // Replace nodes with rendered LaTeX
                    nodesToReplace.forEach(({ node, parent, html }) => {
                        const span = document.createElement('span');
                        span.innerHTML = html;
                        parent.replaceChild(span, node);
                    });

                } catch (error) {
                    console.error('KaTeX rendering error:', error);
                }
            }, 100);
        } else {
            // Switch back to Edit: Restore raw HTML
            setIsPreviewMode(false);
            contentRef.current.innerHTML = rawContentBeforePreview.current;
        }
    };

    // Helper function to process LaTeX in text
    const processLatexInText = (text: string): string => {
        let result = text;

        try {
            // First, handle display math ($$...$$)
            result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false });
                } catch (e) {
                    return match; // Return original if rendering fails
                }
            });

            // Then, handle inline math ($...$)
            result = result.replace(/\$([^\$]+?)\$/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
                } catch (e) {
                    return match; // Return original if rendering fails
                }
            });
        } catch (error) {
            console.error('Error processing LaTeX:', error);
            return text;
        }

        return result;
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleCommand('insertImage', event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiFormat = async () => {
        if (!contentRef.current || isPreviewMode) return;
        setIsProcessing(true);
        try {
            const currentHtml = contentRef.current.innerHTML;
            const formattedHtml = await formatTextWithGemini(currentHtml);
            contentRef.current.innerHTML = formattedHtml;
            triggerUpdate();
        } catch (error) {
            alert("Failed to format with AI. Check console or try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenLatexModal = () => {
        if (isPreviewMode) return;

        // Save the current cursor position
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedLatexRange.current = selection.getRangeAt(0).cloneRange();
        }

        // Open the modal
        setLatexQuery('');
        setLatexGenerating(false);
        setShowLatexModal(true);
    };

    const handleGenerateLatex = async () => {
        if (!latexQuery.trim()) return;

        setLatexGenerating(true);

        try {
            const latex = await generateLatexFromText(latexQuery);

            // Restore the saved cursor position and insert
            if (savedLatexRange.current) {
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(savedLatexRange.current);

                    // Insert the generated latex at cursor
                    document.execCommand('insertText', false, latex);
                    triggerUpdate();
                }
            }

            setShowLatexModal(false);
        } catch (error) {
            console.error(error);
            alert("Failed to generate LaTeX equation.");
        } finally {
            setLatexGenerating(false);
        }
    };

    const handleOpenReplace = () => {
        if (isPreviewMode) return;
        const selection = window.getSelection();
        const text = selection ? selection.toString() : '';
        setFindTerm(text);
        setReplaceTerm('');
        setShowReplaceModal(true);
    };

    const handleReplace = () => {
        if (!contentRef.current || !findTerm) return;

        const walker = document.createTreeWalker(
            contentRef.current,
            NodeFilter.SHOW_TEXT,
            null
        );

        const nodesToUpdate: { node: Node, newValue: string }[] = [];
        let currentNode = walker.nextNode();

        while (currentNode) {
            const text = currentNode.nodeValue || "";
            if (text.includes(findTerm)) {
                const newText = text.split(findTerm).join(replaceTerm);
                if (newText !== text) {
                    nodesToUpdate.push({ node: currentNode, newValue: newText });
                }
            }
            currentNode = walker.nextNode();
        }

        let count = 0;
        nodesToUpdate.forEach(({ node, newValue }) => {
            node.nodeValue = newValue;
            count++;
        });

        if (count > 0) {
            triggerUpdate();
            setShowReplaceModal(false);
        } else {
            alert("No matches found.");
        }
    };

    const handleExport = () => {
        // If in preview mode, export what we see (rendered math), otherwise raw
        const htmlBody = contentRef.current?.innerHTML || '';
        const blob = new Blob([
            `<!DOCTYPE html><html><head><title>${title}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"></head><body><h1>${title}</h1>${htmlBody}</body></html>`
        ], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Auto-save effect for local state sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isPreviewMode) {
                triggerUpdate();
                setLastSaved(Date.now());
            }
        }, 2000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title]);

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header / Toolbar */}
            <div className="border-b border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={onBack} className="md:hidden p-2 hover:bg-gray-100 rounded">
                        ←
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-bold outline-none bg-transparent w-full placeholder-gray-400"
                        placeholder="Untitled Note"
                        disabled={isPreviewMode}
                    />
                </div>

                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 p-1 rounded-lg shadow-sm overflow-x-auto">
                    {/* Toolbar Buttons - Disable when in preview mode */}
                    <div className={isPreviewMode ? 'opacity-50 pointer-events-none flex items-center gap-1' : 'flex items-center gap-1'}>
                        <ToolbarBtn onClick={() => handleCommand('formatBlock', 'H1')} icon={<Heading1 size={18} />} title="Heading 1" />
                        <ToolbarBtn onClick={() => handleCommand('formatBlock', 'H2')} icon={<Heading2 size={18} />} title="Heading 2" />
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <ToolbarBtn onClick={() => handleCommand('bold')} icon={<Bold size={18} />} title="Bold" />
                        <ToolbarBtn onClick={() => handleCommand('italic')} icon={<Italic size={18} />} title="Italic" />
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <ToolbarBtn onClick={() => handleCommand('insertUnorderedList')} icon={<List size={18} />} title="Bullet List" />
                        <ToolbarBtn onClick={() => handleCommand('insertOrderedList')} icon={<ListOrdered size={18} />} title="Numbered List" />
                        <div className="w-px h-6 bg-gray-300 mx-1"></div>
                        <ToolbarBtn onClick={handleOpenLatexModal} icon={<Sigma size={18} />} title="Generate LaTeX Equation" />
                        <ToolbarBtn onClick={handleOpenReplace} icon={<Replace size={18} />} title="Find & Replace" />
                        <label className="p-2 hover:bg-gray-200 rounded cursor-pointer flex items-center justify-center transition-colors" title="Insert Image" onMouseDown={(e) => e.preventDefault()}>
                            <ImageIcon size={18} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    </div>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    {/* LaTeX Preview Toggle */}
                    <button
                        onClick={handleTogglePreview}
                        onMouseDown={(e) => e.preventDefault()}
                        title={isPreviewMode ? "Edit Mode" : "Preview Mode (Render LaTeX)"}
                        className={`p-2 rounded transition-colors flex items-center justify-center ${isPreviewMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'}`}
                    >
                        {isPreviewMode ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAiFormat}
                        disabled={isProcessing || isPreviewMode}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md text-sm font-medium"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        <span>AI Format</span>
                    </button>
                    <button onClick={handleExport} className="p-2 hover:bg-gray-100 rounded border border-gray-300" title="Export HTML">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto p-8 md:px-24">
                <div
                    ref={contentRef}
                    contentEditable={!isPreviewMode}
                    className={`editor-content min-h-[500px] outline-none text-gray-800 ${isPreviewMode ? 'bg-gray-50 p-4 rounded border border-transparent' : ''}`}
                    style={editorStyles}
                    onInput={triggerUpdate}
                    onBlur={triggerUpdate}
                    onKeyDown={handleKeyDown}
                    data-placeholder={isPreviewMode ? "" : "Start typing... press '@' for AI, use $...$ for Math"}
                />
            </div>

            <div className="p-2 text-xs text-gray-400 border-t border-gray-100 text-center flex justify-between px-4">
                <span>{isPreviewMode ? 'Preview Mode (Read Only)' : 'Edit Mode'}</span>
                {lastSaved ? `Last synced ${new Date(lastSaved).toLocaleTimeString()}` : 'Unsaved changes'}
            </div>

            {/* Gemini Dialog Modal with Review Step */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl border border-black w-full max-w-lg p-6 m-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles size={20} className="text-blue-600" />
                                {aiStep === 'review' ? 'Review & Insert' : 'Ask Gemini'}
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {aiStep !== 'review' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to add?</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiGeneration()}
                                        className="w-full border-b-2 border-gray-300 focus:border-black outline-none px-2 py-2 text-lg"
                                        placeholder="e.g. What is an isolated system?"
                                        disabled={aiStep === 'generating'}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                                    <div className="flex gap-2">
                                        {(['short', 'medium', 'long'] as AiLength[]).map(len => (
                                            <button
                                                key={len}
                                                onClick={() => setAiLength(len)}
                                                disabled={aiStep === 'generating'}
                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all ${aiLength === len
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                                    }`}
                                            >
                                                {len}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowAiModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        disabled={aiStep === 'generating'}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAiGeneration}
                                        disabled={!aiQuery.trim() || aiStep === 'generating'}
                                        className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {aiStep === 'generating' ? <Loader2 className="animate-spin" size={16} /> : "Generate"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Review Step
                            <div className="flex-1 flex flex-col">
                                <div className="p-4 bg-gray-50 border rounded-lg mb-4 flex-1 overflow-y-auto max-h-60">
                                    <h4 className="text-xs uppercase text-gray-400 font-bold mb-2">Generated Content:</h4>
                                    <div
                                        className="prose prose-sm prose-p:my-2"
                                        dangerouslySetInnerHTML={{ __html: generatedPreview }}
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <button
                                        onClick={() => setAiStep('input')}
                                        className="text-sm text-gray-500 hover:text-black underline"
                                    >
                                        ← Modify Prompt
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAiModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleInsertAiContent}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            <Sparkles size={16} /> Insert
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Find & Replace Modal */}
            {showReplaceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl border border-black w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Replace size={20} className="text-orange-600" />
                                Find & Replace
                            </h3>
                            <button onClick={() => setShowReplaceModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Find</label>
                                <input
                                    type="text"
                                    value={findTerm}
                                    onChange={(e) => setFindTerm(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
                                    placeholder="Word to find..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Replace with</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={replaceTerm}
                                    onChange={(e) => setReplaceTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
                                    placeholder="New word..."
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowReplaceModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReplace}
                                    disabled={!findTerm}
                                    className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                                >
                                    Replace All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LaTeX Equation Generation Modal */}
            {showLatexModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl border border-black w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Sigma size={20} className="text-purple-600" />
                                Generate LaTeX Equation
                            </h3>
                            <button onClick={() => setShowLatexModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Describe your equation</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={latexQuery}
                                    onChange={(e) => setLatexQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateLatex()}
                                    className="w-full border-b-2 border-gray-300 focus:border-purple-600 outline-none px-2 py-2 text-lg"
                                    placeholder="e.g. quadratic formula, Pythagorean theorem"
                                    disabled={latexGenerating}
                                />
                                <p className="text-xs text-gray-400 mt-1">Example: "E equals mc squared" or "integral of x squared"</p>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowLatexModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    disabled={latexGenerating}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateLatex}
                                    disabled={!latexQuery.trim() || latexGenerating}
                                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {latexGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sigma size={16} />}
                                    {latexGenerating ? "Generating..." : "Generate"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToolbarBtn = ({ onClick, icon, title }: { onClick: () => void; icon: React.ReactNode; title: string }) => (
    <button
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        title={title}
        className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors flex items-center justify-center"
    >
        {icon}
    </button>
);

export default Editor;