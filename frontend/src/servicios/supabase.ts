// Cliente de Supabase (proyecto acbactasreunion, org ACBenavides)
// La clave publishable es pública por diseño: la seguridad real son las
// políticas RLS de la base de datos.

import { createClient } from "@supabase/supabase-js";

const URL_SUPABASE = "https://uwtiyskposglzgpksmig.supabase.co";
const CLAVE_PUBLICA = "sb_publishable_GH-wAa6xRRF_crCPUWBufA_Q99R_MNn";

export const supabase = createClient(URL_SUPABASE, CLAVE_PUBLICA);
