import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';

interface PersonalizationData {
    id: number | string;
    topic: string;
    description: string;
    content: string;
    notes: string;
    date: string;
    audio_file?: string;
}

interface AiResultProps {
    personalization_data: PersonalizationData;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Result', href: '#' },
];

export default function AiResult({ personalization_data }: AiResultProps) {
    const { data, setData, post, processing, errors } = useForm({
        content: personalization_data.content,
        notes: personalization_data.notes,
    });
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const handleRegenerate = () => {
        console.log('Regenerate for UID:', personalization_data.id);
    };

    const handleSave = () => {
        console.log('Save for UID:', personalization_data.id, 'Notes:', data.notes);
    };

    const handleCopy = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(data.content)
                .then(() => {
                    console.log('Content copied to clipboard!');
                    setShowCopySuccess(true);
                    setTimeout(() => setShowCopySuccess(false), 2000);
                })
                .catch((err) => {
                    console.error('Failed to copy content using navigator.clipboard:', err);
                    fallbackCopyTextToClipboard(data.content);
                });
        } else {
            fallbackCopyTextToClipboard(data.content);
        }
    };

    const fallbackCopyTextToClipboard = (text: string) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('Content copied to clipboard using fallback!');
                setShowCopySuccess(true);
                setTimeout(() => setShowCopySuccess(false), 2000);
            } else {
                console.error('Fallback: Copying text command was unsuccessful');
                alert('Failed to copy text. Please copy it manually.');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Failed to copy text. Please copy it manually.');
        }

        document.body.removeChild(textArea);
    };

    const handleShare = () => {
        console.log('Share UID:', personalization_data.id);
    };

    const handleDownload = async () => {
        // Download text content as .md
        const textBlob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
        const textUrl = URL.createObjectURL(textBlob);
        const textLink = document.createElement('a');
        textLink.href = textUrl;
        textLink.download = `${personalization_data.topic.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'content'}.md`;
        document.body.appendChild(textLink);
        textLink.click();
        document.body.removeChild(textLink);
        URL.revokeObjectURL(textUrl);

        if (personalization_data.audio_file) {
            try {
                const response = await fetch(personalization_data.audio_file);
                if (!response.ok) {
                    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
                }
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audioLink = document.createElement('a');
                audioLink.href = audioUrl;

                let audioFileName = 'audio.mp3';
                const originalFileName = personalization_data.audio_file.substring(personalization_data.audio_file.lastIndexOf('/') + 1);
                if (originalFileName) {
                    const nameParts = originalFileName.split('.');
                    const ext = nameParts.length > 1 ? nameParts.pop() : 'mp3';
                    audioFileName = `${
                        nameParts
                            .join('.')
                            .replace(/[^a-z0-9_]+/gi, '_')
                            .toLowerCase() ||
                        personalization_data.topic.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() ||
                        'audio'
                    }.${ext}`;
                } else {
                    audioFileName = `${personalization_data.topic.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'audio'}.mp3`;
                }

                audioLink.download = audioFileName;
                document.body.appendChild(audioLink);
                audioLink.click();
                document.body.removeChild(audioLink);
                URL.revokeObjectURL(audioUrl);
                console.log('Audio downloaded successfully.');
            } catch (error) {
                console.error('Failed to download audio:', error);
                alert('Failed to download audio. Please try again or check the console for errors.');
            }
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`AI Result - ${personalization_data.topic}`} />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>AI Generated Learning Path</CardTitle>
                        <CardDescription>Topic: {personalization_data.topic}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="mb-2 text-lg font-semibold">Generated Content:</h3>
                            <div className="bg-muted min-h-[200px] rounded-md border p-4 whitespace-pre-wrap">{data.content}</div>
                        </div>
                        {personalization_data.audio_file && (
                            <div>
                                <h3 className="mb-2 text-lg font-semibold">Audio Version:</h3>
                                <audio controls src={personalization_data.audio_file} className="w-full">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Your Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Add your personal notes here..."
                                rows={5}
                                disabled={processing}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-between gap-2">
                        {/* <div className="flex gap-2">
                            <Button onClick={handleRegenerate} variant="outline" disabled={processing}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                            </Button>
                            <Button onClick={handleSave} disabled={processing}>
                                <Save className="mr-2 h-4 w-4" /> Save Notes
                            </Button>
                        </div> */}
                        <div className="flex gap-2">
                            <Button onClick={handleCopy} variant="ghost" size="icon" title="Copy Content">
                                {showCopySuccess ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            {/* <Button onClick={handleShare} variant="ghost" size="icon" title="Share">
                                <Share2 className="h-4 w-4" />
                            </Button> */}
                            <Button onClick={handleDownload} variant="ghost" size="icon" title="Download">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
