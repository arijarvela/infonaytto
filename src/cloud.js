import { db, ensureAuth } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Mitä tallennetaan pilveen (pidetään schema pienenä ja selkeänä)
function pickPersistable(cfg) {
  return {
    city: cfg.city || "",
    kids: Array.isArray(cfg.kids) ? cfg.kids : ["Onerva","Nanni","Elmeri"],
    ics: cfg.ics || {},          // Wilma-ICS linkit
    icsProxy: cfg.icsProxy || "",// mahdollinen proxy
    timetableSlots: cfg.timetableSlots || ["8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16"],
  };
}

const COLLECTION = "settings";
const DEFAULT_DOC_ID = "perhe";

export async function loadSettings(docId = DEFAULT_DOC_ID) {
  const ref = doc(db, COLLECTION, docId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveSettings(cfg, docId = DEFAULT_DOC_ID) {
  await ensureAuth(); // vaaditaan kirjoitusta varten
  const ref = doc(db, COLLECTION, docId);
  await setDoc(ref, pickPersistable(cfg), { merge: true });
}
