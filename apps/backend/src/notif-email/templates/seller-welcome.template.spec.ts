// BÊTA-PRIVÉE-PREP — Couverture template seller-welcome (FR + EN).
import { sellerWelcomeTemplate } from './seller-welcome.template';
import { sellerWelcomeEnTemplate } from './seller-welcome.en.template';

const baseData = {
  sellerDisplayName: 'Vanille de Mayotte MCH',
  onboardingUrl: 'https://iox.mycloud.yt/seller/profile/edit',
  supportEmail: 'support@iox.mch',
};

describe('seller-welcome template (FR)', () => {
  it('subject contient le nom du seller', () => {
    const subject = sellerWelcomeTemplate.subject(baseData);
    expect(subject).toBe(
      'Bienvenue sur IOX Marketplace, Vanille de Mayotte MCH !',
    );
  });

  it('html contient onboardingUrl', () => {
    const html = sellerWelcomeTemplate.html(baseData);
    expect(html).toContain(baseData.onboardingUrl);
    expect(html).toContain('Vanille de Mayotte MCH');
    expect(html).toContain('support@iox.mch');
  });

  it('text contient onboardingUrl', () => {
    const text = sellerWelcomeTemplate.text(baseData);
    expect(text).toContain(baseData.onboardingUrl);
    expect(text).toContain('Vanille de Mayotte MCH');
  });
});

describe('seller-welcome template (EN)', () => {
  it('subject contient le nom du seller en anglais', () => {
    const subject = sellerWelcomeEnTemplate.subject(baseData);
    expect(subject).toBe(
      'Welcome to IOX Marketplace, Vanille de Mayotte MCH!',
    );
  });

  it('html contient onboardingUrl', () => {
    const html = sellerWelcomeEnTemplate.html(baseData);
    expect(html).toContain(baseData.onboardingUrl);
    expect(html).toContain('Vanille de Mayotte MCH');
    expect(html).toContain('Welcome to IOX Marketplace');
  });

  it('text contient onboardingUrl', () => {
    const text = sellerWelcomeEnTemplate.text(baseData);
    expect(text).toContain(baseData.onboardingUrl);
    expect(text).toContain('Complete my profile');
  });
});
