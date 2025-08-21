export default function StreambetTOS() {
  return (
    <article className="mx-auto px-4 py-10 text-base leading-relaxed text-foreground">
      {/* PDF Viewer */}
      <section aria-label="Terms PDF" className="mb-10">
        <div className="h-[90vh]">
          <object
            data="/docs/terms.pdf#view=FitH"
            type="application/pdf"
            className="w-full h-full rounded-md border"
          >
            <p className="text-sm text-muted-foreground">
              Your browser can’t display PDFs inline.{' '}
              <a href="/docs/terms.pdf" className="underline">Download the PDF</a>.
            </p>
          </object>
        </div>
      </section>
    </article>
  );
}
