import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';

interface LearningPath {
    id: number | string;
    topic: string;
    level: string;
    date: string;
}

interface HistoryProps {
    learningPaths: LearningPath[];
}

const breadcrumbs: BreadcrumbItemType[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Learning History', href: route('history') },
];

export default function History({ learningPaths }: HistoryProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Learning History" />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Learning History</CardTitle>
                        <CardDescription>A list of your previously generated learning paths.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {learningPaths.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Level</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {learningPaths.map((path) => (
                                        <TableRow key={path.id}>
                                            <TableCell className="font-medium">{path.topic}</TableCell>
                                            <TableCell>{path.level}</TableCell>
                                            <TableCell>{new Date(path.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={route('ai.result', { personalization: path.id.toString() })}>
                                                        <Eye className="mr-2 h-4 w-4" /> View
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-muted-foreground text-center">No learning paths found.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
