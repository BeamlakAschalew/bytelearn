import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface Question {
    id: number | string; // Assuming questions might have an ID from the backend later if needed
    question: string;
    choices: string[];
    correct_answer: string;
}

interface QuizData {
    id: number;
    title: string;
    level: string;
    number_of_questions: number;
    questions: Question[];
}

interface ShowQuizProps {
    auth: any;
    quiz: QuizData;
    errors: any;
}

export default function ShowQuiz({ auth, quiz, errors: backendErrors }: ShowQuizProps) {
    const { data, setData, post, processing, errors } = useForm<{ [key: number]: string }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const handleAnswerChange = (questionIndex: number, answer: string) => {
        setData((prevData) => ({ ...prevData, [questionIndex]: answer }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Transform data for submission to match expected 'answers' array format
        const answersArray = quiz.questions.map((_, index) => data[index] || '');
        router.post(
            route('quizzes.submit', { quiz: quiz.id }),
            {
                answers: answersArray,
            },
            {
                onError: (err) => {
                    console.error('Submission error:', err);
                },
            },
        );
    };

    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <AppLayout>
            <Head title={quiz.title} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Question {currentQuestionIndex + 1} of {quiz.number_of_questions}
                            </CardTitle>
                            <CardDescription>{currentQuestion.question}</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <RadioGroup
                                    value={data[currentQuestionIndex] || ''}
                                    onValueChange={(value) => handleAnswerChange(currentQuestionIndex, value)}
                                >
                                    {currentQuestion.choices.map((choice, choiceIndex) => (
                                        <div key={choiceIndex} className="flex items-center space-x-2">
                                            <RadioGroupItem value={choice} id={`q${currentQuestionIndex}-choice${choiceIndex}`} />
                                            <Label htmlFor={`q${currentQuestionIndex}-choice${choiceIndex}`}>{choice}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {errors && (errors as Record<string, string>)[`answers.${currentQuestionIndex}`] && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {(errors as Record<string, string>)[`answers.${currentQuestionIndex}`]}
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between mt-4">
                                {currentQuestionIndex > 0 && (
                                    <Button type="button" variant="outline" onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}>
                                        Previous
                                    </Button>
                                )}
                                {currentQuestionIndex < quiz.number_of_questions - 1 ? (
                                    <Button
                                        type="button"
                                        onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                                        disabled={!data[currentQuestionIndex]}
                                    >
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={processing || Object.keys(data).length !== quiz.number_of_questions}>
                                        {processing ? 'Submitting...' : 'Submit Quiz'}
                                    </Button>
                                )}
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
