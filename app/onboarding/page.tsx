import { createOrganisation } from "./actions";
import { LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function OnboardingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Setup Organisation</h1>
                    <SignOutButton>
                        <button className="text-slate-400 hover:text-slate-600">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </SignOutButton>
                </div>

                <p className="text-slate-600 mb-6">
                    To get started, please register your Food Bank organisation. You will be assigned as the Administrator.
                </p>

                <form action={createOrganisation} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-slate-900">Organisation Name</label>
                        <input required name="name" id="name" placeholder="e.g. My Food Bank" className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2" />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="country" className="text-sm font-medium text-slate-900">Country</label>
                        <select required name="country" id="country" className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                            <option value="UK">United Kingdom</option>
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            {/* Add more as needed */}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="state" className="text-sm font-medium text-slate-900">State / County</label>
                            <input required name="state" id="state" placeholder="e.g. London" className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="city" className="text-sm font-medium text-slate-900">City</label>
                            <input required name="city" id="city" placeholder="e.g. Westminster" className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 h-10 py-2 px-4 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 mt-6">
                        Create Organisation
                    </button>
                </form>
            </div>
        </div>
    );
}
