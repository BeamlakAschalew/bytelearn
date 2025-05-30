import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import React, { FormEvent, useState } from 'react';

interface UserData {
    id: number;
    name: string;
    email: string;
    skill_title: string | null;
    experience_score: number | null;
}

interface SearchPageProps extends Record<string, unknown> {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    searchedSkill: string | null;
    users: UserData[];
}

const EmployerSearchPage: React.FC = () => {
    const { searchedSkill: initialSearchedSkill, users, auth } = usePage<SearchPageProps>().props;
    const [skill, setSkill] = useState(initialSearchedSkill || '');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        router.get(route('employer.search'), { skill }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout>
            <Head title="Search Users by Skill" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-neutral-900">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            <form onSubmit={handleSubmit}>
                                {' '}
                                {/* Use onSubmit and call handleSubmit */}
                                <div className="mb-4">
                                    <label htmlFor="skill" className="block text-sm font-medium text-neutral-700 dark:text-gray-300">
                                        Search by Skill
                                    </label>
                                    <input
                                        type="text"
                                        name="skill"
                                        id="skill"
                                        value={skill}
                                        onChange={(e) => setSkill(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700"
                                        placeholder="e.g., PHP, React, Project Management"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                                >
                                    Search
                                </button>
                            </form>

                            {initialSearchedSkill && users.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-lg leading-6 font-medium text-neutral-900 dark:text-neutral-200">
                                        Results for "{initialSearchedSkill}"
                                    </h3>
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                                            <thead className="bg-neutral-50 dark:bg-neutral-700">
                                                <tr>
                                                    <th
                                                        scope="col"
                                                        className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                                    >
                                                        Name
                                                    </th>
                                                    <th
                                                        scope="col"
                                                        className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                                    >
                                                        Email
                                                    </th>
                                                    <th
                                                        scope="col"
                                                        className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                                    >
                                                        Skill
                                                    </th>
                                                    <th
                                                        scope="col"
                                                        className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                                    >
                                                        Experience Score
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-700 dark:bg-neutral-800">
                                                {users.map((user) => (
                                                    <tr key={user.id}>
                                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                                                            {user.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-300">
                                                            {user.email}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-300">
                                                            {user.skill_title}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-300">
                                                            {user.experience_score}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {initialSearchedSkill && users.length === 0 && (
                                <div className="mt-8">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No users found with the skill "{initialSearchedSkill}".
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default EmployerSearchPage;
