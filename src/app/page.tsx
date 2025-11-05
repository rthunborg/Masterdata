import { Link } from '@/lib/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from '@/lib/i18n';

export default function Home() {
  return (
    <div 
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/stena-bg.jpg')" }}
    >
      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-black/50 -z-10" />
      
      <main className="relative w-full max-w-2xl px-6 py-12">
        <Card className="p-8 md:p-12 shadow-lg bg-white">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
                <center>{t.landing.title}</center>
              </h1>
              <p className="text-lg text-zinc-600">
                <center>{t.landing.description}</center>
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto px-12" size="lg">
                  {t.landing.loginButton}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
