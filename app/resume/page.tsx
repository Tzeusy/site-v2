import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume",
  description: "Resume and downloadable CV for Tze How.",
};

export default function ResumePage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Resume</p>
        <h1 className="text-4xl sm:text-5xl">Curriculum vitae</h1>
        <p className="text-muted">
          A PDF copy is embedded below. You can also download it directly.
        </p>
      </header>

      <p>
        <a href="/resume.pdf" download>
          Download PDF
        </a>
      </p>

      <div className="overflow-hidden rounded-md border border-rule">
        <object
          data="/resume.pdf"
          type="application/pdf"
          width="100%"
          height="900"
          aria-label="Resume PDF viewer"
        >
          <div className="space-y-3 p-6">
            <p className="text-muted">
              Your browser does not support embedded PDFs. Download the file
              instead.
            </p>
            <p>
              <a href="/resume.pdf" download>
                Download resume.pdf
              </a>
            </p>
          </div>
        </object>
      </div>
    </section>
  );
}
