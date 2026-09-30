'use client';

import { EditPencilIcon, TrashIcon } from '../../components/Icons';

export default function PlansTab({
  plans,
  editingPlan,
  setEditingPlan,
  planForm,
  setPlanForm,
  savePlan,
  startEditPlan,
  deletePlan,
  formatPrice,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">{editingPlan ? 'Edit Internet Package' : 'Create Internet Package'}</h3>
            <p className="sa-card-sub">Packages visible in the user storefront</p>
          </div>
          {editingPlan && (
            <button className="sa-btn-pill-small" onClick={() => {
              setEditingPlan(null);
              setPlanForm({ id: '', name: '', speed: '', price: '', duration: '', popular: false, sort_order: 0, devices: 1, upload_speed: '12M', download_speed: '12M' });
            }}>Cancel</button>
          )}
        </div>

        <div className="sa-form-grid-3">
          <div className="sa-field-box"><label>Plan ID *</label><input value={planForm.id} onChange={e => setPlanForm({ ...planForm, id: e.target.value })} placeholder="e.g. 1-Hour-Pass" disabled={!!editingPlan} /></div>
          <div className="sa-field-box"><label>Display Name *</label><input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. 1 Hour Unlimited" /></div>
          <div className="sa-field-box"><label>Speed / Spec</label><input value={planForm.speed} onChange={e => setPlanForm({ ...planForm, speed: e.target.value })} placeholder="e.g. 12Mbps • 1 Device" /></div>
          <div className="sa-field-box"><label>Price (₦) *</label><input type="number" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} placeholder="100" /></div>
          <div className="sa-field-box"><label>Duration *</label><input value={planForm.duration} onChange={e => setPlanForm({ ...planForm, duration: e.target.value })} placeholder="e.g. 1h, 24h, 7d" /></div>
          <div className="sa-field-box"><label>Devices (shared-users)</label><input type="number" min="1" max="10" value={planForm.devices} onChange={e => setPlanForm({ ...planForm, devices: e.target.value })} /></div>
          <div className="sa-field-box"><label>Upload Speed</label><input value={planForm.upload_speed} onChange={e => setPlanForm({ ...planForm, upload_speed: e.target.value })} placeholder="12M" /></div>
          <div className="sa-field-box"><label>Download Speed</label><input value={planForm.download_speed} onChange={e => setPlanForm({ ...planForm, download_speed: e.target.value })} placeholder="12M" /></div>
          <div className="sa-field-box"><label>Sort Order</label><input type="number" value={planForm.sort_order} onChange={e => setPlanForm({ ...planForm, sort_order: e.target.value })} /></div>
        </div>

        <div className="sa-plan-form-footer">
          <label className="sa-checkbox-label">
            <input type="checkbox" checked={planForm.popular} onChange={e => setPlanForm({ ...planForm, popular: e.target.checked })} />
            <span>Featured / Best Value</span>
          </label>
          <button className="sa-btn-primary" onClick={savePlan}>{editingPlan ? 'Update' : 'Publish'} Package</button>
        </div>
      </div>

      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div><h3 className="sa-card-title">Active Catalog</h3><p className="sa-card-sub">Available for purchase</p></div>
          <span className="sa-badge">{plans.length} Plans</span>
        </div>
        <div className="sa-table-responsive">
          <table className="sa-modern-table">
            <thead><tr><th>NAME</th><th>PRICE</th><th>DURATION</th><th>DEVICES</th><th>SPEED</th><th>FEATURED</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id}>
                  <td className="sa-font-bold">{p.name}</td>
                  <td className="sa-color-purple sa-font-bold">{formatPrice(p.price)}</td>
                  <td>{p.duration}</td>
                  <td>{p.devices || 1} Device{(p.devices || 1) > 1 ? 's' : ''}</td>
                  <td className="sa-color-muted">{p.upload_speed || '12M'}/{p.download_speed || '12M'}</td>
                  <td>{p.popular ? <span className="sa-badge sa-badge-purple">★ Popular</span> : <span className="sa-color-muted">—</span>}</td>
                  <td>
                    <div className="sa-actions-flex">
                      <button className="sa-btn-action-edit" onClick={() => startEditPlan(p)}><EditPencilIcon size={16} color="#141417" /></button>
                      <button className="sa-btn-action-delete" onClick={() => deletePlan(p.id)}><TrashIcon size={16} color="#EF4444" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
