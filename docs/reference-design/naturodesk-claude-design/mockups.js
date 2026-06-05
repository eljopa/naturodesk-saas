/* NaturoDesk — product mockups injected into .app[data-mock] */
(function () {
  const ic = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M17 11a3 3 0 0 0 0-6"/></svg>',
    pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l2-6 4 12 2-6h6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" stroke-linecap="round"/></svg>',
    bill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex:none"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/></svg>',
    shield: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex:none"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>',
  };

  const sidebar = (active) => `
    <div class="app__side">
      <div class="app__brand"><span class="dot"></span>NaturoDesk</div>
      ${[['grid','Tableau de bord'],['cal','Agenda'],['users','Patients'],['pulse','Bilans'],['leaf','Protocoles'],['bill','Facturation'],['globe','Ma page pro']]
        .map(([k,l]) => `<div class="navitem ${l===active?'active':''}">${ic[k]}<span>${l}</span></div>`).join('')}
    </div>`;

  const appt = (time, name, type, kind, init) => `
    <div style="display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--line-soft);border-left:3px solid ${kind};border-radius:12px;background:#fff">
      <div style="font-weight:800;color:var(--forest);font-size:13px;width:46px">${time}</div>
      <div class="avatar" style="width:32px;height:32px;font-size:12px">${init}</div>
      <div style="flex:1"><div style="font-weight:700;font-size:13.5px;color:var(--forest)">${name}</div><div style="font-size:12px;color:var(--muted)">${type}</div></div>
      <span class="chip chip--sage">60 min</span>
    </div>`;

  const agenda = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">naturodesk.com/agenda</div></div>
    <div class="app__body">
      ${sidebar('Agenda')}
      <div class="app__main">
        <div class="m-row" style="justify-content:space-between;margin-bottom:18px">
          <div><h3 class="m-h">Agenda</h3><div style="font-size:12.5px;color:var(--muted);font-weight:600">Semaine du 8 juin 2026</div></div>
          <span class="chip chip--sand">5 rendez-vous</span>
        </div>
        <div style="display:grid;gap:10px">
          ${appt('09:00','Élise Fontaine','Première consultation','#799664','EF')}
          ${appt('10:30','Marc Lefèvre','Suivi · vitalité','#B5895F','ML')}
          ${appt('14:00','Inès Caron','Protocole digestion','#AAB59F','IC')}
          ${appt('16:00','Paul Mercier','Bilan complet','#DCC2B2','PM')}
        </div>
      </div>
    </div>`;

  const agendaMini = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">Agenda · aujourd'hui</div></div>
    <div style="padding:16px;display:grid;gap:9px">
      <div class="m-row" style="justify-content:space-between"><h3 class="m-h" style="font-size:16px">Aujourd'hui</h3><span class="chip chip--sage">4 RDV</span></div>
      ${appt('09:00','Élise Fontaine','Première consultation','#799664','EF')}
      ${appt('10:30','Marc Lefèvre','Suivi · vitalité','#B5895F','ML')}
    </div>`;

  const ring = (score, size) => `
    <svg viewBox="0 0 120 120" style="width:${size}px;height:${size}px">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--sage-tint)" stroke-width="12"/>
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--sage)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${314}" stroke-dashoffset="${314*(1-score/100)}" transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" font-family="var(--serif)" font-size="30" fill="var(--forest)" font-weight="600">${score}</text>
      <text x="60" y="76" text-anchor="middle" font-family="var(--sans)" font-size="11" fill="var(--muted)" font-weight="700">/ 100</text>
    </svg>`;

  const bar = (label, val) => `
    <div style="display:grid;gap:5px">
      <div class="m-row" style="justify-content:space-between"><span style="font-size:12.5px;font-weight:700;color:var(--forest)">${label}</span><span style="font-size:12px;color:var(--muted);font-weight:700">${val}%</span></div>
      <div style="height:7px;border-radius:99px;background:var(--sage-tint)"><div style="height:100%;width:${val}%;border-radius:99px;background:linear-gradient(90deg,var(--sage-soft),var(--sage))"></div></div>
    </div>`;

  const bilanMini = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">Bilan de vitalité</div></div>
    <div style="padding:18px">
      <div class="m-row" style="gap:16px;margin-bottom:16px">
        ${ring(72,96)}
        <div><div style="font-family:var(--serif);font-size:18px;color:var(--forest)">Score de vitalité</div><div style="font-size:12.5px;color:var(--muted);font-weight:600">Élise Fontaine · 8 juin</div><span class="chip chip--sage" style="margin-top:8px;display:inline-block">En progression</span></div>
      </div>
      <div style="display:grid;gap:11px">
        ${bar('Digestion',64)}${bar('Sommeil',58)}${bar('Énergie',76)}
      </div>
    </div>`;

  const fiche = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">naturodesk.com/patients/elise-f</div></div>
    <div class="app__body">
      ${sidebar('Patients')}
      <div class="app__main">
        <div class="m-row" style="gap:14px;margin-bottom:18px">
          <div class="avatar" style="width:52px;height:52px;font-size:18px">EF</div>
          <div style="flex:1"><h3 class="m-h">Élise Fontaine</h3><div style="font-size:12.5px;color:var(--muted);font-weight:600">34 ans · Patiente depuis mars 2026</div></div>
          <span class="chip chip--sand">Suivi actif</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 130px;gap:16px;align-items:center;background:var(--sage-wash);border:1px solid var(--sage-tint);border-radius:14px;padding:16px 18px;margin-bottom:16px">
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--sage-deep);margin-bottom:8px">Motif principal</div>
            <div style="font-size:14px;color:var(--forest);line-height:1.5">Fatigue chronique et troubles digestifs. Objectif : retrouver de l'énergie et réguler le transit.</div>
          </div>
          ${ring(72,110)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="border:1px solid var(--line-soft);border-radius:12px;padding:14px"><div style="font-size:11.5px;font-weight:800;color:var(--taupe);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Protocole en cours</div><div style="font-size:13.5px;color:var(--forest);font-weight:600">Drainage hépatique · 6 sem.</div></div>
          <div style="border:1px solid var(--line-soft);border-radius:12px;padding:14px"><div style="font-size:11.5px;font-weight:800;color:var(--taupe);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Prochain RDV</div><div style="font-size:13.5px;color:var(--forest);font-weight:600">22 juin · 10:30</div></div>
        </div>
      </div>
    </div>`;

  const pagepro = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">${ic.globe ? '🌿 ' : ''}naturodesk.com/camille-renaud</div></div>
    <div style="background:var(--cream)">
      <div style="display:grid;grid-template-columns:120px 1fr;gap:18px;padding:24px;align-items:center;background:linear-gradient(180deg,var(--sage-wash),#fff)">
        <image-slot id="pp-avatar" shape="circle" style="width:104px;height:104px" placeholder="Photo"></image-slot>
        <div>
          <div style="font-family:var(--serif);font-size:26px;color:var(--forest);line-height:1.1">Camille Renaud</div>
          <div style="font-size:13px;color:var(--muted);font-weight:600;margin:4px 0 12px">Naturopathe certifiée · Lyon 6ᵉ</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip chip--sage">Digestion</span><span class="chip chip--sage">Sommeil</span><span class="chip chip--sage">Stress</span></div>
        </div>
      </div>
      <div style="padding:18px 24px;display:grid;gap:10px">
        <div class="m-row" style="justify-content:space-between"><div style="font-family:var(--serif);font-size:16px;color:var(--forest)">Prendre rendez-vous</div><div class="stars" style="color:var(--copper);display:flex;gap:2px;font-size:12px">★★★★★ <span style="color:var(--muted);font-weight:700;margin-left:6px">4,9 · 87 avis</span></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div style="border:1px solid var(--line);border-radius:12px;padding:13px 15px;background:#fff"><div style="font-weight:700;font-size:13.5px;color:var(--forest)">Première consultation</div><div style="font-size:12px;color:var(--muted)">60 min · à distance ou au cabinet</div><div style="font-family:var(--serif);font-size:18px;color:var(--copper-deep);margin-top:6px">70 €</div></div>
          <div style="border:1px solid var(--line);border-radius:12px;padding:13px 15px;background:#fff"><div style="font-weight:700;font-size:13.5px;color:var(--forest)">Consultation de suivi</div><div style="font-size:12px;color:var(--muted)">45 min · au cabinet</div><div style="font-family:var(--serif);font-size:18px;color:var(--copper-deep);margin-top:6px">55 €</div></div>
        </div>
        <button style="margin-top:4px;background:var(--sage);color:#fff;border:none;border-radius:99px;padding:13px;font-weight:800;font-size:14px">Réserver un créneau</button>
      </div>
    </div>`;

  const sevRow = (name, sev, color, txt) => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:13px 14px;border:1px solid var(--line-soft);border-radius:12px;background:#fff">
      <span style="flex:none;width:9px;height:9px;border-radius:50%;background:${color};margin-top:5px"></span>
      <div style="flex:1"><div class="m-row" style="justify-content:space-between"><span style="font-weight:700;font-size:13.5px;color:var(--forest)">${name}</span><span class="chip" style="background:${color}22;color:${color}">${sev}</span></div><div style="font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.45">${txt}</div></div>
    </div>`;

  const moteur = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">naturodesk.com/analyse</div></div>
    <div class="app__body">
      ${sidebar('Protocoles')}
      <div class="app__main">
        <div style="display:flex;gap:9px;align-items:center;border:1.5px solid var(--sage);border-radius:99px;padding:10px 16px;margin-bottom:16px;color:var(--sage-deep)">
          ${ic.search}<span style="font-weight:600;color:var(--forest);font-size:13.5px">Millepertuis (Hypericum perforatum)</span>
        </div>
        <div class="m-row" style="gap:8px;margin-bottom:14px">
          <span class="chip chip--sage">Interactions</span><span class="chip chip--line">Effets secondaires</span><span class="chip chip--line">Précautions</span>
        </div>
        <div style="display:grid;gap:9px">
          ${sevRow('Contraceptifs oraux','Majeure','#C26B5A','Peut réduire l\'efficacité contraceptive.')}
          ${sevRow('Antidépresseurs (ISRS)','Majeure','#C26B5A','Risque de syndrome sérotoninergique.')}
          ${sevRow('Anticoagulants','Modérée','#C99A4E','Surveillance recommandée.')}
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:11.5px;color:var(--muted);font-weight:600">
          ${ic.shield}<span>Sources officielles de santé · mise à jour 2026</span>
        </div>
      </div>
    </div>`;

  const moteurMini = () => `
    <div class="app__bar"><div class="app__dots"><i></i><i></i><i></i></div><div class="app__url">Moteur d'analyse</div></div>
    <div style="padding:16px">
      <div style="display:flex;gap:8px;align-items:center;border:1.5px solid var(--sage);border-radius:99px;padding:9px 14px;margin-bottom:12px;color:var(--sage-deep)">${ic.search}<span style="font-weight:600;color:var(--forest);font-size:13px">Millepertuis</span></div>
      <div style="display:grid;gap:8px">
        ${sevRow('Contraceptifs oraux','Majeure','#C26B5A','Efficacité réduite.')}
        ${sevRow('Anticoagulants','Modérée','#C99A4E','Surveillance.')}
      </div>
    </div>`;

  const REG = { agenda, 'agenda-wide': agenda, 'agenda-mini': agendaMini, 'bilan-mini': bilanMini, fiche, pagepro, moteur, 'moteur-mini': moteurMini };

  document.querySelectorAll('.app[data-mock]').forEach(el => {
    const fn = REG[el.getAttribute('data-mock')];
    if (fn) el.innerHTML = fn();
  });
})();
