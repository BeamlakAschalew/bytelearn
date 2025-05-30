import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';

interface Quiz {
    id: number;
    title: string;
    level: string;
    number_of_questions: number;
    created_at: string; // Assuming created_at is a string, adjust if it's a Date object
}

interface QuizzesIndexProps {
    quizzes: Quiz[];
    auth: any; // Add auth prop if needed for AppLayout or other purposes
    errors: any; // Add errors prop if needed
}

export default function QuizzesIndex({ quizzes, auth, errors }: QuizzesIndexProps) {
    return (
        <AppLayout>
            <Head title="Quizzes" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Available Quizzes</h1>
                        <Button asChild>
                            <Link href={route('quizzes.create')}>Create New Quiz</Link>
                        </Button>
                    </div>
                    {quizzes.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {quizzes.map((quiz) => (
                                <Card key={quiz.id}>
                                    <CardHeader>
                                        <CardTitle>{quiz.title}</CardTitle>
                                        <CardDescription>
                                            Level: {quiz.level.charAt(0).toUpperCase() + quiz.level.slice(1)} | Questions: {quiz.number_of_questions}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Created: {new Date(quiz.created_at).toLocaleDateString()}
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button asChild className="w-full">
                                            <Link href={route('quizzes.show', quiz.id)}>Start Quiz</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-lg text-gray-500 dark:text-gray-400">No quizzes available at the moment.</p>
                            <Button asChild className="mt-4">
                                <Link href={route('quizzes.create')}>Create Your First Quiz</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
