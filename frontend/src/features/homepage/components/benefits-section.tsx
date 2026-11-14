import { Icon } from "@/components/ui/icon";
import { benefits } from "@/features/homepage/data/homepage-fixtures";

export function BenefitsSection() {
  return (
    <section
      id="why-skyfare"
      className="section benefits-section"
      aria-labelledby="benefits-heading"
    >
      <div className="section-heading section-heading--center scroll-discover">
        <h2 id="benefits-heading">Why Choose SkyFare</h2>
        <p>
          Engineered for speed, fiscal accountability, and bespoke executive
          service.
        </p>
      </div>

      <div className="benefit-grid">
        {benefits.map((benefit, index) => (
          <article
            className={`benefit-card scroll-discover scroll-discover--stagger-${index + 1}`}
            key={benefit.title}
          >
            <span className="benefit-card__icon">
              <Icon name={benefit.icon} size={25} />
            </span>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
