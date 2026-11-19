-- Datos de demostración (ficticios). Solo para desarrollo local.
insert into tenants (slug, name, contact_email, brand_color)
values ('lifepoint', 'Lifepoint', 'contacto@lifepoint.example', '#0f766e')
on conflict (slug) do nothing;

-- BORRADOR de textos legales (versión 1) en es / en / de / ar.
-- Pendiente de revisión por una persona con conocimiento de RGPD y LOPDGDD antes de publicar.
-- {church} se sustituye por el nombre de la iglesia: el texto aceptado queda guardado literal.
insert into consent_texts (tenant_id, purpose, version, locale, body, is_required)
select t.id, d.purpose::consent_purpose, 1, d.locale, replace(d.body, '{church}', t.name), d.is_required
from tenants t,
(values
  ('membership', 'es', true, $t$Acepto que {church} guarde mis datos personales (los que indico en este formulario) para gestionar mi pertenencia como miembro de la iglesia. Sé que la pertenencia a una iglesia es un dato de categoría especial (art. 9 del RGPD), que solo se trata con mi consentimiento explícito y que puedo retirarlo cuando quiera.$t$),
  ('membership', 'en', true, $t$I agree that {church} may keep my personal data (the data I provide in this form) to manage my membership of the church. I understand that church membership is a special category of data (Art. 9 GDPR), that it is processed only with my explicit consent, and that I can withdraw it at any time.$t$),
  ('membership', 'de', true, $t$Ich bin damit einverstanden, dass {church} meine personenbezogenen Daten (die Angaben in diesem Formular) speichert, um meine Mitgliedschaft in der Gemeinde zu verwalten. Mir ist bewusst, dass die Zugehörigkeit zu einer Religionsgemeinschaft eine besondere Kategorie personenbezogener Daten ist (Art. 9 DSGVO), die nur mit meiner ausdrücklichen Einwilligung verarbeitet wird, und dass ich sie jederzeit widerrufen kann.$t$),
  ('membership', 'ar', true, $t$أوافق على أن تحتفظ {church} ببياناتي الشخصية (البيانات التي أدخلها في هذا النموذج) لإدارة عضويتي في الكنيسة. أعلم أن الانتماء إلى كنيسة هو فئة خاصة من البيانات (المادة 9 من اللائحة العامة لحماية البيانات GDPR)، وأنها لا تُعالَج إلا بموافقتي الصريحة، وأن بإمكاني سحب هذه الموافقة في أي وقت.$t$),

  ('privacy_policy', 'es', true, $t$He leído la política de privacidad de {church} y la acepto.$t$),
  ('privacy_policy', 'en', true, $t$I have read and accept the privacy policy of {church}.$t$),
  ('privacy_policy', 'de', true, $t$Ich habe die Datenschutzerklärung von {church} gelesen und akzeptiere sie.$t$),
  ('privacy_policy', 'ar', true, $t$قرأت سياسة الخصوصية الخاصة بـ {church} وأوافق عليها.$t$),

  ('comms_email', 'es', false, $t$Quiero recibir noticias y comunicaciones de {church} por correo electrónico. Puedo darme de baja cuando quiera.$t$),
  ('comms_email', 'en', false, $t$I want to receive news and communications from {church} by email. I can unsubscribe at any time.$t$),
  ('comms_email', 'de', false, $t$Ich möchte Neuigkeiten und Mitteilungen von {church} per E-Mail erhalten. Ich kann mich jederzeit abmelden.$t$),
  ('comms_email', 'ar', false, $t$أرغب في تلقي أخبار ورسائل {church} عبر البريد الإلكتروني. يمكنني إلغاء الاشتراك في أي وقت.$t$),

  ('comms_whatsapp', 'es', false, $t$Quiero recibir noticias y comunicaciones de {church} por WhatsApp, en el número de móvil que indico. Puedo darme de baja cuando quiera.$t$),
  ('comms_whatsapp', 'en', false, $t$I want to receive news and communications from {church} by WhatsApp, at the mobile number I provide. I can unsubscribe at any time.$t$),
  ('comms_whatsapp', 'de', false, $t$Ich möchte Neuigkeiten und Mitteilungen von {church} per WhatsApp an die von mir angegebene Handynummer erhalten. Ich kann mich jederzeit abmelden.$t$),
  ('comms_whatsapp', 'ar', false, $t$أرغب في تلقي أخبار ورسائل {church} عبر واتساب على رقم الجوال الذي أدخلته. يمكنني إلغاء الاشتراك في أي وقت.$t$),

  ('comms_sms', 'es', false, $t$Quiero recibir noticias y comunicaciones de {church} por SMS, en el número de móvil que indico. Puedo darme de baja cuando quiera.$t$),
  ('comms_sms', 'en', false, $t$I want to receive news and communications from {church} by SMS, at the mobile number I provide. I can unsubscribe at any time.$t$),
  ('comms_sms', 'de', false, $t$Ich möchte Neuigkeiten und Mitteilungen von {church} per SMS an die von mir angegebene Handynummer erhalten. Ich kann mich jederzeit abmelden.$t$),
  ('comms_sms', 'ar', false, $t$أرغب في تلقي أخبار ورسائل {church} عبر الرسائل النصية القصيرة SMS على رقم الجوال الذي أدخلته. يمكنني إلغاء الاشتراك في أي وقت.$t$),

  ('visibility', 'es', false, $t$Acepto que mi nombre y mis datos de contacto sean visibles para los líderes de {church}. Si no marco esta casilla, solo los administradores podrán verlos.$t$),
  ('visibility', 'en', false, $t$I agree that my name and contact details may be visible to the leaders of {church}. If I do not tick this box, only administrators will be able to see them.$t$),
  ('visibility', 'de', false, $t$Ich bin damit einverstanden, dass mein Name und meine Kontaktdaten für die Leitenden von {church} sichtbar sind. Ohne dieses Häkchen können nur Administratoren sie sehen.$t$),
  ('visibility', 'ar', false, $t$أوافق على أن يكون اسمي وبيانات التواصل الخاصة بي ظاهرة لقادة {church}. إذا لم أحدد هذه الخانة فلن يراها إلا المسؤولون.$t$),

  ('images', 'es', false, $t$Autorizo que {church} use fotos o vídeos en los que yo aparezca, tomados en sus actividades, en sus canales de comunicación. Puedo retirar la autorización cuando quiera.$t$),
  ('images', 'en', false, $t$I authorise {church} to use photos or videos in which I appear, taken at its activities, on its communication channels. I can withdraw this authorisation at any time.$t$),
  ('images', 'de', false, $t$Ich erlaube {church}, Fotos oder Videos von mir, die bei ihren Veranstaltungen entstehen, in ihren Kommunikationskanälen zu verwenden. Ich kann diese Erlaubnis jederzeit widerrufen.$t$),
  ('images', 'ar', false, $t$أسمح لـ {church} باستخدام الصور أو مقاطع الفيديو التي أظهر فيها، والتي تُلتقط في أنشطتها، في قنوات التواصل الخاصة بها. يمكنني سحب هذا الإذن في أي وقت.$t$)
) as d(purpose, locale, is_required, body)
where t.slug = 'lifepoint'
on conflict (tenant_id, purpose, version, locale) do nothing;
