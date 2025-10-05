"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <section className="py-20 bg-secondary/20" id="contact">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center flex flex-col items-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground">
            ¿Listo para Revolucionar tus Finanzas?
          </h2>
          <div className="mt-14 flex justify-center w-full">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-xl font-semibold tracking-tight w-full max-w-md"
            >
              <Link href="/signup" className="flex items-center justify-center gap-3">
                <Zap className="h-5 w-5" aria-hidden="true" />
                Crea TU cuenta ahora
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
