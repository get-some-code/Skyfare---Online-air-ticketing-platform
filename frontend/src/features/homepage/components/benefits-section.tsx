import { Icon } from "@/components/ui/icon";
import { benefits } from "@/features/homepage/data/homepage-fixtures";

export function BenefitsSection() {
  return (
    <section
      id="why-skyfare"
      className="section benefits-section"
      aria-labelledby="benefits-heading"
    >
      <div className="section-heading section-heading--center">
        <span className="eyebrow eyebrow--blue">
          <Icon name="badge" size={16} />
          A thoughtful travel experience
        </span>
        <h2 id="benefits-heading">Why Choose SkyFare</h2>
        <p>
          A design concept for simpler journeys and clearer travel planning.
        </p>
      </div>

      <div className="benefit-grid">
        {benefits.map((benefit) => (
          <article className="benefit-card" key={benefit.title}>
            <span className="benefit-card__icon">
              <Icon name={benefit.icon} size={25} />
            </span>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        ))}
      </div>
      <p className="section-disclaimer">
        Product concepts shown for preview only; no fare guarantee, booking,
        corporate service, or live support is available here.
      </p>
    </section>
  );
}
