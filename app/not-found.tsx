import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1>Page not found</h1>
      <p className="text-zim-muted mt-2 mb-6">The page you requested does not exist.</p>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
    </div>
  );
}
