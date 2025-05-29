import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Personalization', href: route('personalize') },
];

export default function PersonalizeForm() {
    const { data, setData, post, processing, errors, reset } = useForm({
        topic: '',
        learning_level: 'Beginner',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('personalize.store'), {
            // onSuccess: () => reset(), // Or redirect to results page
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AI Personalization" />
            <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
                <Card className="w-full max-w-lg">
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
                                    disabled={processing}
                                />
                                <InputError message={errors.topic} className="mt-2" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="learning_level">Learning Level</Label>
                                <Select value={data.learning_level} onValueChange={(value) => setData('learning_level', value)} disabled={processing}>
                                    <SelectTrigger id="learning_level">
                                        <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Beginner">Beginner</SelectItem>
                                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                                        <SelectItem value="Advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.learning_level} className="mt-2" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={processing} className="w-full">
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Content
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
