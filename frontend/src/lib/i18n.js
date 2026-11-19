import { useSite } from "../site/SiteContext";

const TA = {
  "Learn more": "மேலும் அறிக", "Read case study": "விரிவான ஆய்வைப் படிக்க", "Visit project": "திட்டத்தைப் பார்வையிட", "Search projects or technologies": "திட்டங்கள் அல்லது தொழில்நுட்பங்களைத் தேடுக",
  "All categories": "அனைத்து வகைகள்", "All types": "அனைத்து வகைகளும்", "All": "அனைத்தும்", "No projects match.": "பொருந்தும் திட்டங்கள் இல்லை.", "Contribution": "பங்களிப்பு",
  "Industry experience": "தொழில் அனுபவம்", "Education": "கல்வி", "Company project": "நிறுவனத் திட்டம்", "Founder's previous professional experience": "நிறுவனரின் முந்தைய தொழில்முறை அனுபவம்",
  "Personal project": "தனிப்பட்ட திட்டம்", "Demonstration project": "செயல்விளக்கத் திட்டம்", "Illustrative image": "விளக்கப் படம்", "Search articles": "கட்டுரைகளைத் தேடுக",
  "No articles yet.": "இன்னும் கட்டுரைகள் இல்லை.", "Name *": "பெயர் *", "Email *": "மின்னஞ்சல் *", "Phone": "தொலைபேசி", "Company": "நிறுவனம்", "Country": "நாடு",
  "Required service": "தேவையான சேவை", "Budget": "பட்ஜெட்", "Timeline": "காலக்கெடு", "Project description": "திட்ட விளக்கம்", "Select…": "தேர்ந்தெடுக்கவும்…",
  "Send enquiry": "விசாரணையை அனுப்பு", "Sending…": "அனுப்புகிறது…", "Message received": "செய்தி பெறப்பட்டது", "We'll reply within one business day.": "ஒரு வேலை நாளுக்குள் பதிலளிப்போம்.",
  "Attach a brief (PDF, DOC, PNG, JPG · max 10 MB)": "சுருக்கத்தை இணைக்கவும் (PDF, DOC, PNG, JPG · அதிகபட்சம் 10 MB)",
  "I agree that my details will be used to respond to this enquiry, as described in the privacy policy.": "தனியுரிமைக் கொள்கையில் விவரிக்கப்பட்டுள்ளபடி, இந்த விசாரணைக்குப் பதிலளிக்க என் விவரங்கள் பயன்படுத்தப்படுவதை ஒப்புக்கொள்கிறேன்.",
  "← All projects": "← அனைத்து திட்டங்கள்", "The challenge": "சவால்", "Our approach": "எங்கள் அணுகுமுறை", "What we delivered": "நாங்கள் வழங்கியது", "Role & contribution": "பங்கு & பங்களிப்பு",
  "Key features": "முக்கிய அம்சங்கள்", "Technology": "தொழில்நுட்பம்", "Screenshots": "திரைப்பிடிப்புகள்", "Planning something similar?": "இதுபோன்ற ஒன்றைத் திட்டமிடுகிறீர்களா?",
  "Start your project": "உங்கள் திட்டத்தைத் தொடங்குங்கள்", "Ask us anything": "எதையும் கேளுங்கள்", "Type your message…": "உங்கள் செய்தியைத் தட்டச்சு செய்க…",
  "This page wandered into the mist.": "இந்தப் பக்கம் மூடுபனியில் தொலைந்துவிட்டது.", "Back home": "முகப்புக்குத் திரும்பு", "Contact": "தொடர்பு", "← All articles": "← அனைத்து கட்டுரைகள்",
  "Share your experience": "உங்கள் அனுபவத்தைப் பகிருங்கள்", "Your name *": "உங்கள் பெயர் *", "Your role": "உங்கள் பதவி", "Organisation": "நிறுவனம்", "Your feedback *": "உங்கள் கருத்து *",
  "I allow The Nilgiris Softwares to publish this testimonial with my name, role and organisation.": "என் பெயர், பதவி மற்றும் நிறுவனத்துடன் இந்தச் சான்றை வெளியிட The Nilgiris Softwares-க்கு அனுமதி அளிக்கிறேன்.",
  "Submit testimonial": "சான்றைச் சமர்ப்பிக்க", "Thank you! Your testimonial will appear once reviewed.": "நன்றி! சரிபார்த்த பின் உங்கள் சான்று வெளியிடப்படும்.",
  "Translating…": "மொழிபெயர்க்கிறது…",
};
const DICTS = { ta: TA };

export const tr = (lang, s) => (DICTS[lang] && DICTS[lang][s]) || s;
export function useT() {
  const { lang } = useSite();
  return (s) => tr(lang, s);
}
