import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TermsAndConditionsProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
}

const TERMS = [
  "1. NATURE OF SERVICE: MozzatBet is an entertainment and gaming platform designed exclusively for fun, enjoyment, and recreational purposes. By using this platform, you acknowledge and agree that the primary purpose of MozzatBet is to provide users with a thrilling and engaging gaming experience. Any funds deposited into your MozzatBet account are considered voluntary donations made in support of the continued development, maintenance, and operation of this great game. These donations are non-refundable and are made at your sole discretion. You understand that depositing funds does not entitle you to any guaranteed returns, winnings, or compensation of any kind. The platform operates on the principle that users contribute to the gaming ecosystem voluntarily, and in return, they receive access to an exciting crash game experience. From time to time, as a token of appreciation for your participation and engagement with the platform, you may receive monetary rewards that can be withdrawn to your M-Pesa account. These rewards are discretionary, not guaranteed, and are provided solely at the platform's discretion as recognition of your active participation in the gaming community.",
  "2. ELIGIBILITY: You must be at least 18 years of age or the legal age of majority in your jurisdiction to use MozzatBet. By creating an account, you confirm that you meet this requirement.",
  "3. ACCOUNT REGISTRATION: You agree to provide accurate, current, and complete information during the registration process. You are responsible for maintaining the confidentiality of your account credentials.",
  "4. SINGLE ACCOUNT POLICY: Each user is permitted to maintain only one active account. Creating multiple accounts may result in the suspension or termination of all associated accounts.",
  "5. ACCOUNT SECURITY: You are solely responsible for all activities that occur under your account. You must immediately notify MozzatBet of any unauthorized use of your account or any other breach of security.",
  "6. DEPOSITS: All deposits are processed through PesaPal and M-Pesa payment systems. The minimum deposit amount is KES 10. Deposits are considered voluntary contributions to the platform.",
  "7. DEPOSIT PROCESSING: Deposits are typically processed instantly but may take up to 24 hours in some cases. MozzatBet is not responsible for delays caused by payment processors or network issues.",
  "8. WITHDRAWALS: Withdrawal requests are processed to your registered M-Pesa number. Withdrawals are subject to verification and may require identity confirmation.",
  "9. WITHDRAWAL LIMITS: MozzatBet reserves the right to set minimum and maximum withdrawal limits. These limits may be adjusted at any time without prior notice.",
  "10. WITHDRAWAL PROCESSING TIME: Withdrawal requests are typically processed within 24 hours but may take up to 72 hours during peak periods or for verification purposes.",
  "11. GAME FAIRNESS: The crash game uses a provably fair algorithm to determine outcomes. Each game round is independently generated and cannot be manipulated by the platform or any user.",
  "12. GAME RESULTS: All game results are final and binding. MozzatBet does not reverse or modify game outcomes under any circumstances.",
  "13. BETTING RULES: You must place your bet before the game round begins. Once a bet is placed, it cannot be cancelled or modified.",
  "14. CASH OUT: You may cash out at any time during an active game round before the crash occurs. Failure to cash out before the crash results in loss of the bet amount.",
  "15. AUTO CASH OUT: The auto cash out feature is provided as a convenience. MozzatBet is not responsible for any technical issues that may prevent auto cash out from executing at the desired multiplier.",
  "16. MINIMUM BET: The minimum bet amount is KES 10. Bets below this amount will not be accepted.",
  "17. MAXIMUM BET: MozzatBet reserves the right to set maximum bet limits. These limits may vary and can be changed at any time.",
  "18. RESPONSIBLE GAMING: MozzatBet encourages responsible gaming. You should only participate with funds you can afford to lose. If you feel you have a gaming problem, please seek professional help.",
  "19. SELF-EXCLUSION: You may request temporary or permanent self-exclusion from the platform by contacting customer support.",
  "20. COOLING OFF PERIOD: You may request a cooling off period during which your account will be temporarily suspended. During this period, you will not be able to place bets or make deposits.",
  "21. DEPOSIT LIMITS: You may set personal deposit limits to help manage your spending. Once set, deposit limits can only be reduced immediately; increases require a 24-hour waiting period.",
  "22. INTELLECTUAL PROPERTY: All content, graphics, logos, and software on MozzatBet are the property of the platform and are protected by intellectual property laws.",
  "23. USER CONDUCT: You agree not to use the platform for any unlawful purpose, to harass other users, or to attempt to manipulate the platform or its games.",
  "24. PROHIBITED ACTIVITIES: You may not use automated software, bots, or any other mechanical or technological means to interact with the platform without express written permission.",
  "25. COLLUSION: Any form of collusion between users is strictly prohibited and may result in immediate account termination and forfeiture of funds.",
  "26. FRAUD PREVENTION: MozzatBet employs various fraud detection measures. Suspicious activities may result in account suspension, investigation, and potential termination.",
  "27. IDENTITY VERIFICATION: MozzatBet reserves the right to request identity verification documents at any time. Failure to provide requested documents may result in account suspension.",
  "28. ANTI-MONEY LAUNDERING: MozzatBet complies with anti-money laundering regulations. Suspicious transactions may be reported to relevant authorities.",
  "29. DATA COLLECTION: MozzatBet collects personal information including but not limited to name, email address, phone number, and transaction history.",
  "30. DATA USE: Your personal data is used to provide and improve our services, process transactions, communicate with you, and ensure platform security.",
  "31. DATA SHARING: MozzatBet does not sell your personal data to third parties. Data may be shared with payment processors and as required by law.",
  "32. DATA SECURITY: MozzatBet implements industry-standard security measures to protect your personal data. However, no system is completely secure, and we cannot guarantee absolute data security.",
  "33. COOKIES: MozzatBet uses cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts.",
  "34. DATA RETENTION: Your personal data is retained for as long as your account is active and for a reasonable period thereafter as required by law.",
  "35. USER RIGHTS: You have the right to access, correct, or delete your personal data. You may exercise these rights by contacting customer support.",
  "36. SERVICE AVAILABILITY: MozzatBet strives to provide uninterrupted service but does not guarantee that the platform will be available at all times. Scheduled maintenance and unexpected outages may occur.",
  "37. TECHNICAL ISSUES: MozzatBet is not responsible for losses resulting from technical issues, including but not limited to internet connectivity problems, device malfunctions, or software errors.",
  "38. SYSTEM ERRORS: In the event of a system error that results in incorrect game outcomes or payouts, MozzatBet reserves the right to correct the error and adjust affected accounts.",
  "39. FORCE MAJEURE: MozzatBet is not liable for any failure to perform its obligations due to circumstances beyond its reasonable control, including natural disasters, war, terrorism, or government actions.",
  "40. LIMITATION OF LIABILITY: To the maximum extent permitted by law, MozzatBet's total liability to you shall not exceed the amount you have deposited in your account in the preceding 12 months.",
  "41. INDEMNIFICATION: You agree to indemnify and hold harmless MozzatBet, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the platform.",
  "42. DISCLAIMER OF WARRANTIES: MozzatBet is provided 'as is' without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.",
  "43. DISPUTE RESOLUTION: Any disputes arising from your use of MozzatBet shall first be attempted to be resolved through informal negotiation. If negotiation fails, disputes shall be resolved through binding arbitration.",
  "44. GOVERNING LAW: These terms and conditions are governed by and construed in accordance with the laws of the Republic of Kenya.",
  "45. JURISDICTION: You agree to submit to the exclusive jurisdiction of the courts in Kenya for any disputes that cannot be resolved through arbitration.",
  "46. MODIFICATIONS TO TERMS: MozzatBet reserves the right to modify these terms and conditions at any time. Changes will be effective immediately upon posting on the platform.",
  "47. NOTIFICATION OF CHANGES: While MozzatBet will make reasonable efforts to notify users of significant changes to these terms, it is your responsibility to review the terms regularly.",
  "48. ACCOUNT TERMINATION BY USER: You may close your account at any time by contacting customer support. Outstanding balances will be processed according to our withdrawal policy.",
  "49. ACCOUNT TERMINATION BY PLATFORM: MozzatBet reserves the right to suspend or terminate any account at its sole discretion, with or without cause, and with or without notice.",
  "50. DORMANT ACCOUNTS: Accounts that have been inactive for 12 months or more may be classified as dormant. Dormant accounts may be subject to maintenance fees or closure.",
  "51. PROMOTIONAL OFFERS: MozzatBet may offer promotional bonuses or rewards from time to time. Each promotion is subject to its own specific terms and conditions.",
  "52. BONUS TERMS: Any bonuses or promotional credits are subject to wagering requirements before they can be withdrawn. Specific wagering requirements will be stated with each promotion.",
  "53. REFERRAL PROGRAM: If MozzatBet offers a referral program, referral bonuses are subject to verification and may be reversed if the referred user's account is found to be fraudulent.",
  "54. COMMUNICATION: By creating an account, you consent to receive communications from MozzatBet via email, SMS, or push notifications regarding your account, promotions, and platform updates.",
  "55. OPT-OUT: You may opt out of promotional communications at any time through your account settings. However, you cannot opt out of essential account-related communications.",
  "56. CUSTOMER SUPPORT: MozzatBet provides customer support through in-app channels. Response times may vary based on the volume of inquiries.",
  "57. COMPLAINT PROCEDURE: If you have a complaint, you should first contact customer support. If the issue is not resolved satisfactorily, you may escalate through our formal complaint procedure.",
  "58. THIRD-PARTY LINKS: MozzatBet may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of these websites.",
  "59. THIRD-PARTY SERVICES: MozzatBet uses third-party payment processors and service providers. Your use of these services is subject to their respective terms and conditions.",
  "60. NO GUARANTEE OF WINNINGS: MozzatBet does not guarantee that you will win any money while using the platform. Past performance does not indicate future results.",
  "61. RISK ACKNOWLEDGMENT: You acknowledge that participating in crash games involves risk, and you may lose some or all of the funds you deposit.",
  "62. TAX RESPONSIBILITY: You are solely responsible for determining and paying any taxes that may apply to your winnings or withdrawals from MozzatBet.",
  "63. LEGAL COMPLIANCE: You are responsible for ensuring that your use of MozzatBet complies with all applicable local, state, national, and international laws and regulations.",
  "64. GEOGRAPHIC RESTRICTIONS: MozzatBet may not be available in all jurisdictions. It is your responsibility to ensure that accessing and using the platform is legal in your location.",
  "65. AGE VERIFICATION: MozzatBet reserves the right to verify your age at any time. If you are found to be underage, your account will be terminated and all funds forfeited.",
  "66. NETWORK FEES: Any network fees, data charges, or transaction fees imposed by your mobile carrier or payment provider are your responsibility.",
  "67. CURRENCY: All transactions on MozzatBet are conducted in Kenyan Shillings (KES). Currency conversion fees, if applicable, are your responsibility.",
  "68. PLATFORM UPDATES: MozzatBet may update, modify, or discontinue any feature of the platform at any time without prior notice.",
  "69. BETA FEATURES: Some features may be offered in beta or testing mode. These features are provided without warranty and may be modified or removed at any time.",
  "70. SEVERABILITY: If any provision of these terms is found to be unenforceable, the remaining provisions shall continue to be valid and enforceable.",
  "71. ENTIRE AGREEMENT: These terms and conditions, together with our privacy policy, constitute the entire agreement between you and MozzatBet regarding your use of the platform.",
  "72. WAIVER: The failure of MozzatBet to enforce any right or provision of these terms shall not constitute a waiver of such right or provision.",
  "73. ASSIGNMENT: MozzatBet may assign its rights and obligations under these terms to any third party without your consent. You may not assign your rights without MozzatBet's written consent.",
  "74. SURVIVAL: Any provisions of these terms that by their nature should survive termination shall survive, including but not limited to limitation of liability and indemnification clauses.",
  "75. CONTACT: For any questions regarding these terms and conditions, please contact MozzatBet through our in-app support channels.",
];

const TermsAndConditions = ({ accepted, onAcceptChange }: TermsAndConditionsProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide" : "View"} Terms & Conditions
      </button>

      {expanded && (
        <ScrollArea className="h-40 rounded-lg border border-border bg-secondary/50 p-3">
          <div className="space-y-3 pr-3">
            <h3 className="text-xs font-bold text-foreground">MozzatBet Terms & Conditions</h3>
            <p className="text-[10px] text-muted-foreground italic">Last updated: March 2026</p>
            {TERMS.map((term, i) => (
              <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">
                {term}
              </p>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          id="terms"
          checked={accepted}
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
          className="mt-0.5"
        />
        <label htmlFor="terms" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
          I have read and agree to the <button type="button" onClick={() => setExpanded(true)} className="text-primary underline">Terms & Conditions</button>. I understand that deposits are voluntary donations and withdrawals are discretionary rewards.
        </label>
      </div>
    </div>
  );
};

export default TermsAndConditions;
