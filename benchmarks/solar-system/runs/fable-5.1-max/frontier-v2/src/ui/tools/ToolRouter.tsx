import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import * as S from '../../state/store';
import { app } from '../../app/controller';
import { t } from '../../i18n';
import { Btn, Icon } from '../common';
import { Compare } from './Compare';
import { Measure } from './Measure';
import { ScaleLab } from './ScaleLab';
import { SeasonsLab } from './SeasonsLab';
import { MoonLab } from './MoonLab';
import { OrbitLab } from './OrbitLab';
import { Beyond } from './Beyond';
import { Missions } from '../learn/Missions';
import { Learn } from '../learn/Learn';
import { Encyclopedia } from '../learn/Encyclopedia';
import { ToursDialog } from '../learn/Tours';
import { CollectionsDialog } from '../Collections';
import { SettingsDialog } from '../Settings';
import { HelpDialog, ShareDialog } from '../Help';

/** Full-area workspace for a tool; the scene keeps ticking but is hidden behind it. */
export function Workspace({ title, icon, children, experimental, footer, actions }: { title: string; icon: string; children: ComponentChildren; experimental?: string; footer?: ComponentChildren; actions?: ComponentChildren }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => ref.current?.querySelector<HTMLElement>('h2')?.focus(), 20);
    return () => prev?.focus?.();
  }, []);
  return (
    <section ref={ref} className="tool" role="region" aria-label={title}>
      <div className="panel-header">
        <Icon name={icon} />
        <h2 tabIndex={-1}>{title}</h2>
        {actions}
        <Btn icon="close" iconOnly label={`${t('common.close')} (Esc)`} variant="ghost" onClick={() => app.closeTool()} />
      </div>
      {experimental && <div className="experimental-banner"><Icon name="flask" size={16} /> {experimental}</div>}
      <div className="panel-body">{children}</div>
      {footer && <div className="panel-footer">{footer}</div>}
    </section>
  );
}

export function ToolRouter(): JSX.Element | null {
  const tool = S.activeTool.value;
  switch (tool) {
    case 'compare': return <Compare />;
    case 'measure': return <Measure />;
    case 'scale-lab': return <ScaleLab />;
    case 'seasons-lab': return <SeasonsLab />;
    case 'moon-lab': return <MoonLab />;
    case 'orbit-lab': return <OrbitLab />;
    case 'beyond': return <Beyond />;
    case 'missions': return <Missions />;
    case 'learn': return <Learn />;
    case 'encyclopedia': return <Encyclopedia />;
    case 'tours': return <ToursDialog />;
    case 'collections': return <CollectionsDialog />;
    case 'settings': return <SettingsDialog />;
    case 'help': return <HelpDialog />;
    case 'share': return <ShareDialog />;
    default: return null;
  }
}
