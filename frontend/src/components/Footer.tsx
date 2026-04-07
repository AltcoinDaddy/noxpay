import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-nox-border/30 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/noxpay-logo.svg" alt="NoxPay" className="w-8 h-8" />
              <span className="text-xl font-bold gradient-text-gold">NoxPay</span>
            </div>
            <p className="text-sm text-nox-lightgray leading-relaxed max-w-xs">
              Send rewards on-chain with hidden balances and amounts.
            </p>
          </div>

          {/* Technology */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Technology</h4>
            <ul className="space-y-2">
              <FooterLink href="https://docs.iex.ec/nox-protocol/getting-started/welcome" label="Nox Protocol" />
              <FooterLink href="https://docs.iex.ec/nox-protocol/guides/build-confidential-tokens/erc7984-token" label="ERC-7984 Standard" />
              <FooterLink href="https://cdefi.iex.ec/" label="Confidential Token Demo" />
              <FooterLink href="https://docs.iex.ec/nox-protocol/references/js-sdk/getting-started" label="Nox JS SDK" />
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Resources</h4>
            <ul className="space-y-2">
              <FooterLink href="https://github.com/" label="GitHub Repository" />
              <FooterLink href="https://sepolia.arbiscan.io/" label="Arbiscan (Sepolia)" />
              <FooterLink href="https://discord.com/invite/5TewNUnJHN" label="iExec Discord" />
              <FooterLink href="https://docs.iex.ec/" label="iExec Docs" />
            </ul>
          </div>


        </div>


      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-nox-lightgray hover:text-nox-gold transition-colors flex items-center gap-1.5 group"
      >
        {label}
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    </li>
  );
}
