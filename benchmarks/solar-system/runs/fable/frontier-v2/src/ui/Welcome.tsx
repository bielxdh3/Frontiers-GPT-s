import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import * as S from '../state/store';
import { app } from '../app/controller';
import { tours } from '../app/tours';
import { t } from '../i18n';
import { updateUiMemory } from '../state/persistence';
import { Btn, Icon } from './common';

export function Welcome(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const dismiss = (): void => { S.welcomeOpen.value = false; updateUiMemory({ welcomeDismissed: true }); };
  useEffect(() => {
    const unregister = app.registerLayer('welcome', () => { dismiss(); app.showHint('orbit'); });
    setTimeout(() => ref.current?.querySelector<HTMLElement>('button.primary')?.focus(), 30);
    return unregister;
  }, []);
  const explore = () => { dismiss(); setTimeout(() => app.showHint('orbit'), 400); };
  return (
    <>
      <div className="scrim" onClick={explore} />
      <div ref={ref} className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <Btn className="close" icon="close" iconOnly variant="ghost" label={t('common.close')} onClick={explore} />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--warm)' }}><Icon name="sun" size={44} /></div>
        <h1 id="welcome-title">{t('welcome.title')}</h1>
        <p>{t('welcome.subtitle')}</p>
        <div className="actions">
          <Btn variant="primary" icon="focus" onClick={explore}><span><span>{t('welcome.exploreFreely')}</span><span className="desc">{t('hint.orbit')} · {t('hint.select')}</span></span></Btn>
          <Btn icon="sparkle" onClick={() => { dismiss(); tours.start('grand'); }}><span><span>{t('welcome.grandTour')}</span><span className="desc">{t('tours.duration', { n: 13 })} · ~12 min</span></span></Btn>
          <Btn icon="keyboard" onClick={() => { dismiss(); app.openTool('help'); }}><span><span>{t('welcome.learnControls')}</span><span className="desc">{t('help.mouse.orbit')} · {t('help.mouse.zoom')}</span></span></Btn>
        </div>
        <p className="muted" style={{ margin: '14px 0 0', fontSize: '0.8em' }}>{t('status.approx')} · {t('time.supportedRange')}</p>
      </div>
    </>
  );
}
