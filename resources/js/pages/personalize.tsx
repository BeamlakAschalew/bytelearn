import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Personalization', href: route('personalize') },
];

export default function PersonalizeForm() {
    const { errors: pageErrors } = usePage().props;
    const { data, setData, reset } = useForm({
        topic: '',
        learning_level: 'Beginner',
        note: '',
    });

    const [showResponseArea, setShowResponseArea] = useState(false);
    const [responseContent, setResponseContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (isStreaming) return;

        setShowResponseArea(true);
        setResponseContent('');
        setIsStreaming(true);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const response = await fetch(route('personalize.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'text/plain',
                },
                body: JSON.stringify({
                    topic: data.topic,
                    learning_level: data.learning_level,
                    note: data.note,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log('Personalization stream complete.');
                        break;
                    }
                    const chunk = decoder.decode(value, { stream: true });
                    setResponseContent((prev) => prev + chunk);
                }
                // reset(); // Reset form after successful stream
            } else {
                setResponseContent('No response body received from server.');
            }
        } catch (error) {
            console.error('Error fetching or streaming personalization:', error);
            setResponseContent(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
        } finally {
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
                                {isStreaming && !responseContent && (
                                    <div className="flex items-center justify-center">
                                        <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
                                        <p className="text-muted-foreground ml-2">Generating...</p>
                                    </div>
                                )}
                                <pre className="text-sm whitespace-pre-wrap">{responseContent}</pre>
                                {isStreaming && responseContent && <LoaderCircle className="text-primary mt-2 h-4 w-4 animate-spin" />}
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
