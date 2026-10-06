import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PageTitle, SegmentedTabs } from '../components/ui';
import UploadTab from './create/UploadTab';
import AiPersonTab from './create/AiPersonTab';
import AvatarTab from './create/AvatarTab';

type Method = 'photo' | 'ai' | 'avatar';

const TABS: { value: Method; label: string; icon: string }[] = [
  { value: 'photo', label: 'Upload My Photo', icon: '📸' },
  { value: 'ai', label: 'Choose AI Person', icon: '🤖' },
  { value: 'avatar', label: 'Create Avatar', icon: '🧑‍🎨' },
];

function methodFromParam(p: string | null): Method {
  if (p === 'photo' || p === 'ai' || p === 'avatar') return p;
  return 'photo';
}

/** /create — three ways to make your model. Honors ?method=photo|ai|avatar. */
export default function Create() {
  const { personType } = useApp();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Method>(() => methodFromParam(params.get('method')));

  useEffect(() => {
    setTab(methodFromParam(params.get('method')));
  }, [params]);

  const change = (m: Method) => {
    setTab(m);
    setParams({ method: m }, { replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Create your model"
        sub={`Styling for ${personType} — pick a photo, an AI person, or build an avatar.`}
      />
      <SegmentedTabs ariaLabel="Model creation method" value={tab} onChange={change} options={TABS} />
      <div className="mt-5">
        {tab === 'photo' && <UploadTab />}
        {tab === 'ai' && <AiPersonTab />}
        {tab === 'avatar' && <AvatarTab />}
      </div>
    </div>
  );
}
