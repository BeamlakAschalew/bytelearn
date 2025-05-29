import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle, XCircle } from 'lucide-react'; // Example icons

interface Question {
    question: string;
    choices: string[];
    correct_answer: string;
}

interface QuizData {
    id: number;
    title: string;
    level: string;
    questions: Question[];
}

interface ResultsProps {
    auth: any; // Adjust according to your auth prop structure
    quiz: QuizData;
    score: number;
    totalQuestions: number;
    experienceGained: number;
    userAnswers: string[];
}

export default function QuizResults({ auth, quiz, score, totalQuestions, experienceGained, userAnswers }: ResultsProps) {
    return (
        <AppLayout>
            <Head title={`Results - ${quiz.title}`} />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Your Score</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-4xl font-bold">
                                {score} / {totalQuestions}
                            </p>
                            <p className="text-muted-foreground mt-2 text-lg">
                                You gained <span className="font-semibold text-green-600">{experienceGained}</span> experience points!
                            </p>
                        </CardContent>
                        <CardFooter className="flex justify-center">
                            <Link href={route('dashboard')}>
                                <Button variant="outline" className="mr-2">
                                    Back to Dashboard
                                </Button>
                            </Link>
                            <Link href={route('quizzes.create')}>
                                <Button>Create Another Quiz</Button>
                            </Link>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Review Your Answers</CardTitle>
                            <CardDescription>Check which questions you got right or wrong.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {quiz.questions.map((question, index) => (
                                <div key={index} className="rounded-md border p-4">
                                    <h3 className="mb-2 text-lg font-semibold">
                                        Question {index + 1}: {question.question}
                                    </h3>
                                    <ul className="mb-2 space-y-1">
                                        {question.choices.map((choice, choiceIndex) => {
                                            const userAnswer = userAnswers[index];
                                            const isCorrect = choice === question.correct_answer;
                                            const isUserChoice = choice === userAnswer;
                                            let choiceClass = 'flex items-center p-2 rounded-md ';

                                            if (isCorrect) {
                                                choiceClass += 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
                                            } else if (isUserChoice && !isCorrect) {
                                                choiceClass += 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
                                            } else {
                                                choiceClass += 'bg-gray-50 dark:bg-gray-700';
                                            }

                                            return (
                                                <li key={choiceIndex} className={choiceClass}>
                                                    {isCorrect && <CheckCircle className="mr-2 h-5 w-5 text-green-500" />}
                                                    {!isCorrect && isUserChoice && <XCircle className="mr-2 h-5 w-5 text-red-500" />}
                                                    <span className="flex-1">{choice}</span>
                                                    {isUserChoice && !isCorrect && <span className="ml-2 text-xs">(Your answer)</span>}
                                                    {isCorrect && !isUserChoice && userAnswer && (
                                                        <span className="ml-2 text-xs text-green-600">(Correct answer)</span>
                                                    )}
                                                    {isCorrect && isUserChoice && <span className="ml-2 text-xs">(Correct)</span>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {userAnswers[index] !== question.correct_answer && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Your answer: <span className="font-semibold">{userAnswers[index] || 'Not answered'}</span>. Correct
                                            answer: <span className="font-semibold text-green-600">{question.correct_answer}</span>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
