import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Cpu, MonitorSmartphone, Leaf } from "lucide-react";
import { Button } from "../components/ui/Button";
import { UnsplashImage } from "../components/UnsplashImage";
import { ThemeToggle } from "../components/layout/ThemeToggle";

const STEPS = [
  {
    icon: Radio,
    title: "Sensor reads fill level",
    description: "Ultrasonic sensors inside the bin continuously measure how full it is.",
  },
  {
    icon: Cpu,
    title: "ESP32 thinks locally",
    description: "An on-board microcontroller decides fan ventilation and keeps working even offline.",
  },
  {
    icon: MonitorSmartphone,
    title: "Dashboard shows the truth",
    description: "Live status, history, and alerts sync to the cloud - viewable from anywhere.",
  },
];

export function Landing() {
  return (
    <div className="min-h-dvh bg-ink-50 dark:bg-ink-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-ink-50">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-eco-600 text-white">
            <Leaf className="h-4 w-4" />
          </span>
          EkoGuard
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/app">
            <Button size="sm">Open dashboard</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-eco-100 px-3 py-1 text-sm font-medium text-eco-700 dark:bg-eco-950 dark:text-eco-300">
            <Leaf className="h-3.5 w-3.5" /> Waste-management accountability
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl dark:text-ink-50">
            Turn ordinary bins into <span className="text-eco-600 dark:text-eco-400">accountability data</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-600 dark:text-ink-300">
            EkoGuard connects a bin's fill level and ventilation to a live dashboard - so "someone should empty
            that" becomes a number everyone can see.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app">
              <Button size="lg">
                View live dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <UnsplashImage query="recycling sustainability clean city" className="aspect-4/3 w-full" />
        </motion.div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold text-ink-900 dark:text-ink-50">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-eco-100 text-eco-600 dark:bg-eco-950 dark:text-eco-400">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-ink-900 dark:text-ink-50">{step.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-eco-700 px-8 py-14 text-center dark:bg-eco-800">
          <h2 className="font-display text-3xl font-bold text-white">See it live</h2>
          <p className="mx-auto mt-3 max-w-md text-eco-100">
            Fill level, fan status, and alerts for every registered bin - updated in real time.
          </p>
          <Link to="/app" className="mt-6 inline-block">
            <Button size="lg" variant="secondary">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
