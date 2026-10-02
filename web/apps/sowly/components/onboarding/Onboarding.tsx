'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { IDENTITIES, MAX_IDENTITIES } from '../../lib/identities';
import { completeOnboarding, type HabitDraft } from '../../lib/mutations';
import { useGate } from '../../lib/gate';
import { commit, newId, nowIso, today } from '../../lib/store';
import { EMPTY_DRAFT, HabitForm, intention } from '../habits/HabitForm';
import { ChevronLeftIcon } from '../icons';
import { Button, Input } from '../ui';
import { HoldToCommit } from './HoldToCommit';

type Step = 'identite' | 'habitude' | 'contrat' | 'taches';
const STEPS: Step[] = ['identite', 'habitude', 'contrat', 'taches'];

/**
 * Premiers pas (brief §8.A), juste après la création du compte : une
 * question par écran, un seul bouton principal — le même rythme que le
 * parcours de Vitae. L'accueil du brief (§8.A.1) est devenu la page
 * d'entrée, `/bienvenue`, qui précède la création du compte.
 *
 *   identité → première habitude → contrat → premières tâches
 *
 * Écart assumé avec le brief :
 *   - l'étape « notifications » arrive au lot 2, avec le Web Push : demander
 *     une permission qu'on ne sait pas encore utiliser serait gaspiller la
 *     seule demande que le navigateur nous accorde.
 *
 * Tout est écrit d'un coup à la dernière étape : un onboarding abandonné en
 * route ne laisse aucune donnée orpheline.
 *
 * Les transitions sont faites avec Motion (`AnimatePresence`) et non GSAP
 * comme le prévoyait le brief §7 : un fondu-glissé par étape n'a rien d'une
 * timeline complexe, et GSAP aurait ajouté une seconde librairie d'animation
 * pour ce seul écran.
 */
export function Onboarding() {
  const router = useRouter();
  const store = useGate('onboarding');
  const [step, setStep] = useState<Step>('identite');
  const [direction, setDirection] = useState(1);
  const [identities, setIdentities] = useState<string[]>([]);
  const [habit, setHabit] = useState<HabitDraft>(EMPTY_DRAFT);
  const [tasks, setTasks] = useState(['', '', '']);

  const go = (next: Step): void => {
    setDirection(STEPS.indexOf(next) > STEPS.indexOf(step) ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const back = (): void => {
    const i = STEPS.indexOf(step);
    if (i > 0) go(STEPS[i - 1]!);
  };

  const finish = (): void => {
    commit((data) => completeOnboarding(data, {
      identities,
      habit,
      tasks: tasks.filter((t) => t.trim() !== ''),
    }, newId, nowIso(), today()));
    router.replace('/');
  };

  if (store === null) return null;

  const index = STEPS.indexOf(step);

  return (
    <div className="flex min-h-dvh flex-col pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={back}
          aria-label="Étape précédente"
          className={`-ml-2 rounded-full p-2 text-muted hover:text-ink ${index === 0 ? 'invisible' : ''}`}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? 'bg-primary' : 'bg-line'}`} />
          ))}
        </div>
        <span className="sr-only">Étape {index + 1} sur {STEPS.length}</span>
      </div>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * direction }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-1 flex-col"
        >
          {step === 'identite' ? (
            <Screen
              title="Qui veux-tu devenir ?"
              lead={`Choisis jusqu’à ${MAX_IDENTITIES} identités. Chaque habitude en sera une preuve, jour après jour.`}
              action={
                <Button
                  variant="primary" size="lg" className="w-full"
                  disabled={identities.length === 0}
                  onClick={() => {
                    if (habit.identity === null) setHabit({ ...habit, identity: identities[0] ?? null });
                    go('habitude');
                  }}
                >
                  Continuer
                </Button>
              }
            >
              <ul className="flex flex-col gap-2">
                {IDENTITIES.map((i) => {
                  const on = identities.includes(i.id);
                  const full = !on && identities.length >= MAX_IDENTITIES;
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={full}
                        onClick={() => setIdentities(on ? identities.filter((x) => x !== i.id) : [...identities, i.id])}
                        className={`w-full rounded-2xl border-2 px-4 py-3.5 text-left text-[16px] font-medium transition disabled:opacity-40 ${
                          on ? 'border-primary bg-done-soft text-primary-ink' : 'border-line bg-card text-ink'
                        }`}
                      >
                        {i.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Screen>
          ) : step === 'habitude' ? (
            <Screen
              title="Ta première graine"
              lead="Une seule habitude pour commencer. Assez petite pour ne jamais avoir d’excuse."
              action={
                <Button variant="primary" size="lg" className="w-full" disabled={habit.action.trim() === ''} onClick={() => go('contrat')}>
                  Continuer
                </Button>
              }
            >
              <HabitForm value={habit} onChange={setHabit} identities={identities} showWhy={false} />
            </Screen>
          ) : step === 'contrat' ? (
            <Screen
              title="Ton engagement"
              lead="Pas une promesse d’être parfait. Une promesse de revenir, même après un jour manqué."
              action={<HoldToCommit onCommit={() => setTimeout(() => go('taches'), 450)} />}
            >
              <blockquote className="card flex flex-col gap-3 p-5">
                <p className="font-display text-xl leading-snug font-semibold">{intention(habit)}</p>
                <p className="text-[15px] text-muted">
                  Je commence petit. Je recommence quand je rate. Je deviens{' '}
                  {identities.map((id) => IDENTITIES.find((i) => i.id === id)?.label.replace(/^Quelqu’un/, 'quelqu’un'))
                    .join(', ')}
                  .
                </p>
              </blockquote>
            </Screen>
          ) : (
            <Screen
              title="Et aujourd’hui ?"
              lead="Les habitudes disent qui tu deviens. Les tâches, ce que tu as à faire aujourd’hui. Note-en deux ou trois."
              action={
                <div className="flex flex-col gap-2">
                  <Button variant="primary" size="lg" className="w-full" onClick={finish}>
                    {tasks.some((t) => t.trim() !== '') ? 'Ajouter à ma journée' : 'Commencer'}
                  </Button>
                </div>
              }
            >
              <div className="flex flex-col gap-2">
                {tasks.map((t, i) => (
                  <Input
                    key={i}
                    value={t}
                    onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={['Acheter du pain', 'Rappeler le garagiste', 'Envoyer le devis'][i]}
                    aria-label={`Tâche ${i + 1}`}
                    maxLength={200}
                  />
                ))}
              </div>
            </Screen>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Screen({ title, lead, children, action }: {
  title: string; lead: string; children: React.ReactNode; action: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="text-[15px] text-muted">{lead}</p>
      </header>
      <div className="flex-1">{children}</div>
      <div className="sticky bottom-0 -mx-4 bg-canvas px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{action}</div>
    </div>
  );
}
