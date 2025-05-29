import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface CreateQuizProps {
    auth: any; // Adjust according to your auth prop structure
    errors: any; // To display validation errors from Laravel
}

interface FormData {
    title: string;
    level: 'beginner' | 'intermediate' | 'advanced' | '';
    number_of_questions: number | string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Create quiz', href: route('quizzes.create') },
];

export default function CreateQuiz({ auth, errors: backendErrors }: CreateQuizProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        level: '',
        number_of_questions: 5,
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route('quizzes.store'), {
            onError: () => {
                // Handle server-side validation errors if needed, already covered by `errors` prop
            },
            onSuccess: () => {
                // Optionally reset form or navigate, handled by controller redirect
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Quiz" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quiz Details</CardTitle>
                            <CardDescription>Fill in the details below to generate a new quiz using AI.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label htmlFor="title">Quiz Title</Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="mt-1 block w-full"
                                        required
                                    />
                                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                                    {backendErrors?.gemini && <p className="mt-1 text-sm text-red-600">{backendErrors.gemini}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="level">Difficulty Level</Label>
                                    <Select value={data.level} onValueChange={(value: FormData['level']) => setData('level', value)}>
                                        <SelectTrigger className="mt-1 w-full">
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beginner">Beginner</SelectItem>
                                            <SelectItem value="intermediate">Intermediate</SelectItem>
                                            <SelectItem value="advanced">Advanced</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.level && <p className="mt-1 text-sm text-red-600">{errors.level}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="number_of_questions">Number of Questions</Label>
                                    <Input
                                        id="number_of_questions"
                                        type="number"
                                        value={data.number_of_questions}
                                        onChange={(e) => setData('number_of_questions', parseInt(e.target.value, 10) || 0)}
                                        className="mt-1 block w-full"
                                        min="1"
                                        max="20"
                                        required
                                    />
                                    {errors.number_of_questions && <p className="mt-1 text-sm text-red-600">{errors.number_of_questions}</p>}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={processing} className="mt-4">
                                    {processing ? 'Generating Quiz...' : 'Create Quiz'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
