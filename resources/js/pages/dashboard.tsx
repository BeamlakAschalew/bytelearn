import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Bot, Lightbulb, ListChecks } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard({ personalizationCount, lastActivity }: { personalizationCount: number; lastActivity: string }) {
    const { auth } = usePage<SharedData>().props;
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Welcome Back!</CardTitle>
                        <CardDescription>Ready to personalize your learning journey or explore new topics?</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <Link href={route('personalize')} className="block">
                            <Button className="flex h-auto w-full items-start py-4 text-left">
                                <Lightbulb className="mr-3 h-6 w-6 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Personalize Learning Path</p>
                                    <p className="text-muted-foreground text-sm">Get an AI-generated learning path for any topic.</p>
                                </div>
                            </Button>
                        </Link>
                        <Link href={route('history')} className="block">
                            <Button variant="outline" className="flex h-auto w-full items-start py-4 text-left">
                                <ListChecks className="mr-3 h-6 w-6 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">View Learning History</p>
                                    <p className="text-muted-foreground text-sm">Access your saved learning paths.</p>
                                </div>
                            </Button>
                        </Link>
                        <Link href={route('playground')} className="block md:col-span-2">
                            <Button variant="secondary" className="flex h-auto w-full items-start py-4 text-left">
                                <Bot className="mr-3 h-6 w-6 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">AI Playground</p>
                                    <p className="text-muted-foreground text-sm">Experiment with direct AI prompts.</p>
                                </div>
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Topics Personalized</CardTitle>
                            <Lightbulb className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{personalizationCount}</div>
                            <p className="text-muted-foreground text-xs">Total paths generated</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                            <ListChecks className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{lastActivity}</div>
                            <p className="text-muted-foreground text-xs">Your recent interaction</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total experience points (XP)</CardTitle>
                            <ListChecks className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{auth.user.total_experience}</div>
                            <p className="text-muted-foreground text-xs">Based on the quizes you participated on</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
