import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Volume2 } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface Choice {
    text: string;
    audio_url: string | null;
}

interface Question {
    id: number | string;
    question: string;
    question_audio_url: string | null;
    choices: Choice[];
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
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleAnswerChange = (questionIndex: number, answer: string) => {
        setData((prevData) => ({ ...prevData, [questionIndex]: answer }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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

    const playAudio = (audioUrl: string | null) => {
        if (audioUrl && audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch((err) => console.error('Error playing audio:', err));
        }
    };

    useEffect(() => {
        const currentAudioRef = audioRef.current; // Capture ref value for cleanup
        return () => {
            if (currentAudioRef) {
                currentAudioRef.pause();
                currentAudioRef.src = '';
            }
        };
    }, [currentQuestionIndex]); // Rerun effect if question changes

    const currentQuestion = quiz.questions[currentQuestionIndex];

    console.log(currentQuestion);

    const processedChoices: Choice[] = currentQuestion.choices.map((choiceData: any): Choice => {
        if (typeof choiceData === 'string') {
            return { text: choiceData, audio_url: null };
        }
        return choiceData as Choice;
    });

    return (
        <AppLayout>
            <Head title={quiz.title} />
            <audio ref={audioRef} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>
                                    Question {currentQuestionIndex + 1} of {quiz.number_of_questions}
                                </CardTitle>
                                {currentQuestion.question_audio_url && (
                                    <Button variant="ghost" size="icon" onClick={() => playAudio(currentQuestion.question_audio_url)}>
                                        <Volume2 className="h-5 w-5" />
                                        <span className="sr-only">Play question audio</span>
                                    </Button>
                                )}
                            </div>
                            <CardDescription>{currentQuestion.question}</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <RadioGroup
                                    value={data[currentQuestionIndex] || ''}
                                    onValueChange={(value) => handleAnswerChange(currentQuestionIndex, value)}
                                >
                                    {processedChoices.map((choice, choiceIndex) => (
                                        <div key={choiceIndex} className="flex items-center space-x-2">
                                            <RadioGroupItem value={choice.text} id={`q${currentQuestionIndex}-choice${choiceIndex}`} />
                                            <Label htmlFor={`q${currentQuestionIndex}-choice${choiceIndex}`} className="flex-1">
                                                {choice.text}
                                            </Label>
                                            {choice.audio_url && (
                                                <Button variant="ghost" size="icon" type="button" onClick={() => playAudio(choice.audio_url)}>
                                                    <Volume2 className="h-4 w-4" />
                                                    <span className="sr-only">Play choice audio</span>
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </RadioGroup>
                                {errors && (errors as Record<string, string>)[`answers.${currentQuestionIndex}`] && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {(errors as Record<string, string>)[`answers.${currentQuestionIndex}`]}
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="mt-4 flex justify-between">
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
