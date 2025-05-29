import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCountUp } from '@/hooks/useCountUp';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle, Flame, Star, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti'; // Renamed import for clarity

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
    quiz: QuizData;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    experiencePoints: number;
    userAnswers: string[];
}

export default function QuizResults({ quiz, score, totalQuestions, experiencePoints, userAnswers, correctAnswers }: ResultsProps) {
    const { auth } = usePage<SharedData>().props;

    // Ensure numeric values, defaulting to 0 if NaN, null, or undefined
    const validScore = Number(correctAnswers) || 0;
    const validTotalQuestions = Number(totalQuestions) || 0;
    const validExperienceGained = Number(experiencePoints) || 0;

    const percentageScore = validTotalQuestions > 0 ? (validScore / validTotalQuestions) * 100 : 0;

    const animatedScore = useCountUp(validScore, 1500);
    const animatedTotalQuestions = useCountUp(validTotalQuestions, 1500);
    const animatedExperienceGained = useCountUp(validExperienceGained, 1500);
    const animatedCurrentStreak = useCountUp(auth?.user.current_streak ?? 0, 1500);
    const animatedTotalExperience = useCountUp(auth?.user.total_experience ?? 0, 1500);

    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiKey, setConfettiKey] = useState(0);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    // Get window dimensions for confetti
    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        if (typeof window !== 'undefined') {
            handleResize(); // Set initial size
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
        return () => {}; // Return empty function if window is not defined
    }, []);

    useEffect(() => {
        if (percentageScore >= 90) {
            setShowConfetti(true);
            setConfettiKey((prevKey) => prevKey + 1);
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 7000);
            return () => clearTimeout(timer);
        }
    }, [percentageScore, quiz.id]);

    return (
        <AppLayout>
            <Head title={`Results - ${quiz.title}`} />
            {showConfetti && typeof window !== 'undefined' && (
                <ReactConfetti
                    key={confettiKey}
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={400}
                    gravity={0.12}
                    initialVelocityY={20}
                    tweenDuration={5000}
                    onConfettiComplete={(confetti) => {
                        if (confetti) confetti.reset(); // Optional: reset confetti state if needed by lib
                        setShowConfetti(false);
                    }}
                />
            )}

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Quiz Results: {quiz.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-4xl font-bold">
                                {animatedScore} / {animatedTotalQuestions} Correct ({percentageScore.toFixed(0)}%)
                            </p>
                            <p className="text-muted-foreground mt-2 text-lg">
                                You gained <span className="font-semibold text-green-600">{animatedExperienceGained}</span> experience points!
                            </p>
                            {auth?.user && (
                                <div className="mt-6 space-y-3 border-t pt-4">
                                    <div className="flex items-center justify-center text-lg">
                                        <Flame className="mr-2 h-6 w-6 animate-pulse text-orange-500" />
                                        Current Streak: <span className="ml-1 font-semibold">{animatedCurrentStreak}</span> days
                                    </div>
                                    <div className="flex items-center justify-center text-lg">
                                        <Star className="mr-2 h-6 w-6 animate-bounce text-yellow-500" />
                                        Total Experience: <span className="ml-1 font-semibold">{animatedTotalExperience}</span> XP
                                    </div>
                                </div>
                            )}
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
                            {quiz.questions.map((question: Question, index: number) => (
                                <div key={index} className="rounded-md border p-4">
                                    <h3 className="mb-2 text-lg font-semibold">
                                        Question {index + 1}: {question.question}
                                    </h3>
                                    <ul className="mb-2 space-y-1">
                                        {question.choices.map((choice: string, choiceIndex: number) => {
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
