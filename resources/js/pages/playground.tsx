import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Send } from 'lucide-react';
import { FormEventHandler } from 'react';

interface PlaygroundProps {
    response?: string; // Optional response from previous submission
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Playground', href: route('playground') },
];

export default function Playground({ response: initialResponse }: PlaygroundProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        prompt: '',
    });
    const { data: responseData, setData: setResponseData } = useForm({
        response: initialResponse || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('playground.submit'), {
            onSuccess: (page: any) => {
                // Adjust type as per your Inertia page props
                setResponseData('response', page.props.response || 'No response from server.');
                reset('prompt');
            },
            onError: () => {
                setResponseData('response', 'Error processing your request.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AI Playground" />
            <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>AI Playground</CardTitle>
                        <CardDescription>Send any custom question or prompt to the AI.</CardDescription>
                    </CardHeader>
                    <form onSubmit={submit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="prompt">Your Prompt</Label>
                                <Textarea
                                    id="prompt"
                                    value={data.prompt}
                                    onChange={(e) => setData('prompt', e.target.value)}
                                    placeholder="e.g., Explain quantum computing in simple terms..."
                                    rows={5}
                                    disabled={processing}
                                />
                                <InputError message={errors.prompt} className="mt-2" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                <Send className="mr-2 h-4 w-4" /> Send Prompt
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {responseData.response && (
                    <Card>
                        <CardHeader>
                            <CardTitle>AI Response</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted min-h-[100px] rounded-md border p-4 whitespace-pre-wrap">{responseData.response}</div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
