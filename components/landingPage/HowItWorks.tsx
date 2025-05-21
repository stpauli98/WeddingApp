import Image from "next/image"
import { ArrowRight, QrCode, Upload, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

type HowItWorksProps = {
  id?: string;
};

export default function HowItWorks({ id }: HowItWorksProps) {
  const { t } = useTranslation();
  
  return (
    <section id={id} className="py-20 bg-lp-bg">
      <div className="container px-6 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-lp-text mb-3">{t('howItWorks.title')}</h2>
          <p className="text-base md:text-lg text-lp-text max-w-2xl mx-auto">
            {t('howItWorks.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="space-y-10">
            <div className="flex gap-4 items-start bg-lp-card border border-lp-accent shadow-md rounded-xl p-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-lp-muted flex items-center justify-center">
                <Users className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step1Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step1Description')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center">
                <QrCode className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step2Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step2Description')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step3Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step3Description')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lp-muted flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-lp-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('howItWorks.step4Title')}</h3>
                <p className="text-muted-foreground">
                  {t('howItWorks.step4Description')}
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative w-full aspect-[4/5] max-w-md mx-auto">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photos-by-lanty-O38Id_cyV4M-unsplash.jpg-AxWKul1i86GZ5PjxXEUimpeEnTmupv.jpeg"
                alt="Dekoracija stola za vjenčanje"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover rounded-2xl shadow-xl"
              />

              <div className="absolute -top-6 -left-6 bg-lp-card p-4 rounded-lg shadow-lg">
                <div className="flex items-center justify-center w-16 h-16 bg-lp-muted rounded-full mb-2">
                  <QrCode className="w-8 h-8 text-lp-accent" />
                </div>
                <div className="text-sm font-medium text-center">{t('howItWorks.qrCodeText')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
