const fs = require('fs');

const doReplace = (file) => {
    let code = fs.readFileSync(file, 'utf8');

    // Make sure useTranslation is imported
    if (file.includes('PersonalInfo.jsx') && !code.includes('useTranslation')) {
        code = code.replace(rom 'react';, rom 'react';\nimport { useTranslation } from 'react-i18next';);
    }
    
    // Add t to component if missing
    if (file.includes('PersonalInfo.jsx') && !code.includes('const { t } = useTranslation()')) {
        code = code.replace(export default function PersonalInfo() {, export default function PersonalInfo() {\n    const { t } = useTranslation(););
    }

    const replacements = [
        { from: />My Profile</g, to: '>{t(profile_title)}<' },
        { from: />Manage your identity & personality</g, to: '>{t(profile_subtitle)}<' },
        { from: />Edit Profile /, to: '>{t(profile_btn_edit)} ' },
        { from: />Cancel</g, to: '>{t(profile_btn_cancel)}<' },
        { from: />Save All Changes</g, to: '>{t(profile_btn_save)}<' },
        { from: />My Photos /, to: '>{t(profile_sec_photos)} ' },
        { from: />Identity /, to: '>{t(profile_sec_identity)} ' },
        { from: />Physical Details /, to: '>{t(profile_sec_physical)} ' },
        { from: />Personal Preferences & Quirks /, to: '>{t(profile_sec_preferences)} ' },
        { from: />This represents you before photos are revealed.</g, to: '>{t(profile_avatar_hint)}<' },
        { from: />Optional — but the more you answer, the better your matches!</g, to: '>{t(profile_pref_subtitle)}<' },
        { from: />All done!</g, to: '>{t(profile_all_done)}<' },
        { from: />answered /, to: '>{t(profile_answered)} ' },
        { from: />Full Name</g, to: '>{t(lbl_full_name)}<' },
        { from: />Country</g, to: '>{t(lbl_country)}<' },
        { from: />I identify as</g, to: '>{t(lbl_identify)}<' },
        { from: />Weight</g, to: '>{t(lbl_weight)}<' },
        { from: />Height</g, to: '>{t(lbl_height)}<' },
        { from: />Eye Color</g, to: '>{t(lbl_eyes)}<' },
        { from: />Hair Color</g, to: '>{t(lbl_hair)}<' },
        { from: />Ethnicity</g, to: '>{t(lbl_ethnicity)}<' },
        { from: />Religion</g, to: '>{t(lbl_religion)}<' },
        { from: />Preferred App Language</g, to: '>{t(lbl_app_language)}<' }
    ];

    replacements.forEach(r => {
        code = code.replace(r.from, r.to);
    });

    fs.writeFileSync(file, code);
    console.log('Processed', file);
};

doReplace('src/pages/PersonalInfo.jsx');
