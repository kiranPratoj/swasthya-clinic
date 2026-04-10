import OnboardForm from './OnboardForm';
import BrandMark from '@/components/BrandMark';

export default function OnboardPage() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', background: 'linear-gradient(180deg, var(--color-bg) 0%, white 70%)' }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '520px', 
        background: 'white', 
        borderRadius: 'var(--radius-lg)', 
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', 
          padding: '1.6rem 2rem', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '52px', height: '52px', background: 'rgba(255,255,255,0.16)', 
            borderRadius: '10px', display: 'grid', placeItems: 'center' 
          }}>
            <BrandMark size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.82, marginBottom: '0.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Clinic setup
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0 }}>Register Clinic</h1>
            <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: '0.2rem 0 0' }}>Launch your voice-first clinic under the new hospital theme.</p>
          </div>
        </div>
        
        <OnboardForm />
      </div>
    </div>
  );
}
