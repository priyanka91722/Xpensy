import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function getSession() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession) {
          const demoEmail = 'demo@financeapp.com';
          const demoPassword = 'demo123456';

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: demoPassword,
          });

          if (signInError?.status === 400) {
            const { data: signUpData, error: signUpError } =
              await supabase.auth.signUp({
                email: demoEmail,
                password: demoPassword,
              });

            if (!signUpError && signUpData.session && isMounted) {
              setSession(signUpData.session);
            } else if (!signUpError) {
              const { data: signInData2 } =
                await supabase.auth.signInWithPassword({
                  email: demoEmail,
                  password: demoPassword,
                });

              if (signInData2.session && isMounted) {
                setSession(signInData2.session);
              }
            }
          } else if (
            !signInError &&
            (await supabase.auth.getSession()).data.session &&
            isMounted
          ) {
            const {
              data: { session: newSession },
            } = await supabase.auth.getSession();
            setSession(newSession);
          }
        } else if (isMounted) {
          setSession(currentSession);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { session, loading };
}
