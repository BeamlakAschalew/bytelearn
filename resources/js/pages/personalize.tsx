import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; // Or your preferred theme
import { LoaderCircle } from 'lucide-react'; // Removed Volume2, Square
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Personalization', href: route('personalize') },
];

// Custom component for rendering code blocks with highlighting
const CustomCodeRenderer = ({ node, inline, className, children, ...props }: any) => {
    const codeRef = useRef<HTMLElement>(null);
    const match = /language-(\w+)/.exec(className || '');
    const language = match?.[1];
    const codeContent = String(children).replace(/\n$/, ''); // Process children once

    useEffect(() => {
        if (codeRef.current && !inline) {
            // Ensure the element is clean for highlight.js
            codeRef.current.textContent = codeContent;
            delete (codeRef.current as HTMLElement).dataset.highlighted;
            try {
                hljs.highlightElement(codeRef.current);
            } catch (e) {
                console.error('Error during highlighting:', e);
            }
        }
    }, [codeContent, inline, language]); // Depend on processed codeContent

    if (inline) {
        return (
            <code className={className} {...props}>
                {children}
            </code>
        );
    }

    // For block code, ReactMarkdown wraps <code> in <pre>. We apply ref to <code>.
    return (
        <code ref={codeRef} className={language ? `language-${language}` : ''} {...props}>
            {children}
        </code>
    );
};

export default function PersonalizeForm() {
    const { errors: pageErrors } = usePage().props;
    const { data, setData, reset } = useForm({
        topic: '',
        learning_level: 'Beginner',
        note: '',
        content_type: 'Default',
    });

    const [showResponseArea, setShowResponseArea] = useState(false);
    const [responseContent, setResponseContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false); // Will represent overall loading state
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);

    // Effect for cleaning up speech synthesis - REMOVED

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (isStreaming) return;

        setShowResponseArea(true);
        setResponseContent('');
        setAudioUrl(null);
        setAudioError(null);
        setIsStreaming(true);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const response = await fetch(route('personalize.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'application/json', // Changed from 'text/plain'
                },
                body: JSON.stringify({
                    topic: data.topic,
                    learning_level: data.learning_level,
                    note: data.note,
                    content_type: data.content_type,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const jsonResponse = await response.json();

            if (jsonResponse.textContent) {
                setResponseContent(jsonResponse.textContent);
            } else {
                setResponseContent('No text content received from server.');
            }

            if (jsonResponse.audioUrl) {
                setAudioUrl(jsonResponse.audioUrl);
            }

            if (jsonResponse.audioError) {
                setAudioError(jsonResponse.audioError);
            } else if (jsonResponse.audioUrl && !jsonResponse.audioError && responseContent) {
                // If we have an audio URL and text content, but no specific audio error, clear any previous generic audio error.
                setAudioError(null);
            } else if (!jsonResponse.audioUrl && jsonResponse.textContent) {
                // If we have text but no audio URL and no specific audio error, set a generic one.
                setAudioError('Audio could not be generated for this content.');
            }
        } catch (error) {
            console.error('Error fetching or processing personalization:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setResponseContent(`Error: ${errorMessage}`);
            setAudioError('Failed to retrieve audio due to a network or server error.');
        } finally {
            setIsStreaming(false);
        }
    };

    // handleToggleSpeak function - REMOVED

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AI Personalization" />
            <div className="flex flex-1">
                {showResponseArea && (
                    <div className="w-1/2 border-r p-4 sm:p-6 lg:p-8">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Generated Content</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
                                {isStreaming && !responseContent && (
                                    <div className="flex items-center justify-center">
                                        <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
                                        <p className="text-muted-foreground ml-2">Generating content and audio...</p>
                                    </div>
                                )}
                                {/* TTS Button and Voice Selector START - REMOVED */}
                                {/* New Audio Player and Error Display START */}
                                {responseContent && !isStreaming && (
                                    <div className="mb-4">
                                        {audioUrl && !audioError && (
                                            <div className="mt-4">
                                                <audio controls src={audioUrl} className="w-full">
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </div>
                                        )}
                                        {audioError && (
                                            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                                                <p>Audio Error: {audioError}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* New Audio Player and Error Display END */}
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            pre: (preProps) => <pre className="text-sm whitespace-pre-wrap" {...preProps} />,
                                            code: CustomCodeRenderer,
                                        }}
                                    >
                                        {responseContent}
                                    </ReactMarkdown>
                                </div>
                                {isStreaming && responseContent && (
                                    <div className="mt-2 flex items-center justify-center">
                                        <LoaderCircle className="text-primary h-4 w-4 animate-spin" />
                                        <p className="text-muted-foreground ml-2 text-sm">Finalizing audio...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
                <div className={`p-4 sm:p-6 lg:p-8 ${showResponseArea ? 'w-1/2' : 'flex w-full flex-1 items-center justify-center'}`}>
                    <Card className={`w-full ${showResponseArea ? '' : 'max-w-lg'}`}>
                        <CardHeader>
                            <CardTitle>Personalize Your Learning</CardTitle>
                            <CardDescription>Enter a topic and your learning level to get AI-generated content.</CardDescription>
                        </CardHeader>
                        <form onSubmit={submit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="topic">Topic</Label>
                                    <Input
                                        id="topic"
                                        value={data.topic}
                                        onChange={(e) => setData('topic', e.target.value)}
                                        placeholder="e.g., Algebra, Photosynthesis"
                                        disabled={isStreaming}
                                    />
                                    <InputError message={(pageErrors as any)?.topic} className="mt-2" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="learning_level">Learning Level</Label>
                                    <Select
                                        value={data.learning_level}
                                        onValueChange={(value) => setData('learning_level', value)}
                                        disabled={isStreaming}
                                    >
                                        <SelectTrigger id="learning_level">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Beginner">Beginner</SelectItem>
                                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                                            <SelectItem value="Advanced">Advanced</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={(pageErrors as any)?.learning_level} className="mt-2" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content_type">Content Type Preference</Label>
                                    <Select
                                        value={data.content_type}
                                        onValueChange={(value) => setData('content_type', value)}
                                        disabled={isStreaming}
                                    >
                                        <SelectTrigger id="content_type">
                                            <SelectValue placeholder="Select content type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Default">Default</SelectItem>
                                            <SelectItem value="Concise">Concise</SelectItem>
                                            <SelectItem value="Detailed">Detailed</SelectItem>
                                            <SelectItem value="With Analogies">With Analogies</SelectItem>
                                            <SelectItem value="Include Visuals">Include Visuals (text-based description)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={(pageErrors as any)?.content_type} className="mt-2" />
                                </div>
                                <div className="mb-4 space-y-2">
                                    <Label htmlFor="note">Note</Label>
                                    <Input
                                        id="note"
                                        value={data.note}
                                        onChange={(e) => setData('note', e.target.value)}
                                        placeholder="Add a note (optional)"
                                        disabled={isStreaming}
                                    />
                                    <InputError message={(pageErrors as any)?.note} className="mt-2" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isStreaming} className="w-full">
                                    {isStreaming && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Generate Content
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
