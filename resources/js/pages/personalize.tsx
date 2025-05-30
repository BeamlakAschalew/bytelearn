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
import 'highlight.js/styles/github-dark.css';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Personalization', href: route('personalize') },
];

const CustomCodeRenderer = ({ node, inline, className, children, ...props }: any) => {
    const codeRef = useRef<HTMLElement>(null);
    const match = /language-(\w+)/.exec(className || '');
    const language = match?.[1];
    const codeContent = String(children).replace(/\n$/, ''); // Process children once

    useEffect(() => {
        if (codeRef.current && !inline) {
            codeRef.current.textContent = codeContent;
            delete (codeRef.current as HTMLElement).dataset.highlighted;
            try {
                hljs.highlightElement(codeRef.current);
            } catch (e) {
                console.error('Error during highlighting:', e);
            }
        }
    }, [codeContent, inline, language]);

    if (inline) {
        return (
            <code className={className} {...props}>
                {children}
            </code>
        );
    }

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
    const [isStreaming, setIsStreaming] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [streamGlobalError, setStreamGlobalError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (isStreaming) return;

        setShowResponseArea(true);
        setResponseContent('');
        setAudioUrl(null);
        setAudioError(null);
        setStreamGlobalError(null);
        setIsStreaming(true);

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

            const initiateResponse = await fetch(route('personalize.initiate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    topic: data.topic,
                    learning_level: data.learning_level,
                    note: data.note,
                    content_type: data.content_type,
                }),
            });

            if (!initiateResponse.ok) {
                const errorText = await initiateResponse.text();
                throw new Error(`Failed to initiate stream: ${initiateResponse.status} - ${errorText || 'Unknown error'}`);
            }

            const initiateData = await initiateResponse.json();
            const streamId = initiateData.streamId;

            if (!streamId) {
                throw new Error('Stream ID not received from server.');
            }

            const es = new EventSource(route('personalize.stream', { streamId }));
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log('SSE connection opened.');
                // setIsStreaming(true); // Already set
            };

            es.addEventListener('textChunk', (event) => {
                const eventData = JSON.parse(event.data);
                setResponseContent((prev) => prev + eventData.textChunk);
            });

            es.addEventListener('audioDetails', (event) => {
                const eventData = JSON.parse(event.data);
                setAudioUrl(eventData.audioUrl || null);
                setAudioError(eventData.audioError || null);
                console.log('Audio details received:', eventData);
            });

            es.addEventListener('streamError', (event) => {
                const eventData = JSON.parse(event.data);
                console.error('SSE Stream Error:', eventData.error);
                setStreamGlobalError(eventData.error || 'An error occurred during streaming.');
                setIsStreaming(false);
                es.close();
                eventSourceRef.current = null;
            });

            es.addEventListener('streamEnd', (event) => {
                console.log('SSE Stream Ended:', event.data);
                setIsStreaming(false);
                es.close();
                eventSourceRef.current = null;
            });

            es.onerror = (error) => {
                console.error('SSE Generic Error:', error);
                setStreamGlobalError('Connection error or stream interrupted. Please try again.');
                setIsStreaming(false);
                es.close();
                eventSourceRef.current = null;
            };
        } catch (error) {
            console.error('Error in submit function:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during setup.';
            setStreamGlobalError(errorMessage);
            setIsStreaming(false);
        }
    };

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
                                {isStreaming && !responseContent && !streamGlobalError && (
                                    <div className="flex items-center justify-center">
                                        <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
                                        <p className="text-muted-foreground ml-2">Initiating and generating content...</p>
                                    </div>
                                )}
                                {isStreaming && responseContent && !streamGlobalError && (
                                    <div className="mb-2 flex items-center justify-center">
                                        <LoaderCircle className="text-primary h-6 w-6 animate-spin" />
                                        <p className="text-muted-foreground ml-2">Streaming content... Waiting for audio...</p>
                                    </div>
                                )}
                                {streamGlobalError && (
                                    <div className="my-4 text-sm text-red-600 dark:text-red-400">
                                        <p>Error: {streamGlobalError}</p>
                                    </div>
                                )}

                                {responseContent && (
                                    <div className="mb-4">
                                        {audioUrl && !audioError && (
                                            <div className="mt-4">
                                                <audio controls src={audioUrl} className="w-full">
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </div>
                                        )}
                                        {audioError && !streamGlobalError && (
                                            <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                                                <p>Audio Information: {audioError}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
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
