import { supabase } from '../lib/supabase';

export async function getCompatibility(conversationId, currentUserId) {
    // Verify conversation belongs to user and get the other user's ID
    const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single();

    if (convErr || !conv) throw new Error('Conversation not found');

    const otherUserId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;

    // Fetch both users
    const { data: users, error: usersErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [currentUserId, otherUserId]);

    if (usersErr || !users || users.length !== 2) throw new Error('User data missing');

    const me = users.find(u => u.id === currentUserId);
    const them = users.find(u => u.id === otherUserId);

    // Calculate overlap
    const compatibility = [];

    const checkTrait = (label, myPref, myImportance, theirTrait) => {
        if (!myPref) return;
        const matched = myPref === 'Any' || (myPref.includes(theirTrait));

        compatibility.push({
            label,
            preference: myPref,
            importance: myImportance,
            their_trait: theirTrait,
            matched
        });
    };

    checkTrait('Gender', me.match_gender, me.match_gender_importance, them.my_gender);
    checkTrait('Hair Color', me.match_hair, me.match_hair_importance, them.my_hair);
    checkTrait('Eye Color', me.match_eyes, me.match_eyes_importance, them.my_eyes);
    checkTrait('Ethnicity', me.match_ethnicity, me.match_ethnicity_importance, them.my_ethnicity);
    checkTrait('Religion', me.match_religion, me.match_religion_importance, them.my_religion);

    if (me.match_age_min && me.match_age_max) {
        const matched = them.my_age >= me.match_age_min && them.my_age <= me.match_age_max;
        compatibility.push({
            label: 'Age Range',
            preference: `${me.match_age_min} - ${me.match_age_max}`,
            importance: me.match_age_importance,
            their_trait: them.my_age,
            matched
        });
    }

    // Calculate their preferences vs my traits
    const theirCompatibility = [];
    const checkTheirTrait = (label, theirPref, theirImportance, myTrait) => {
        if (!theirPref) return;
        const matched = theirPref === 'Any' || theirPref.includes(myTrait);
        theirCompatibility.push({ matched, importance: theirImportance });
    };

    checkTheirTrait('Gender', them.match_gender, them.match_gender_importance, me.my_gender);
    checkTheirTrait('Hair Color', them.match_hair, them.match_hair_importance, me.my_hair);
    checkTheirTrait('Eye Color', them.match_eyes, them.match_eyes_importance, me.my_eyes);
    checkTheirTrait('Ethnicity', them.match_ethnicity, them.match_ethnicity_importance, me.my_ethnicity);
    checkTheirTrait('Religion', them.match_religion, them.match_religion_importance, me.my_religion);

    if (them.match_age_min && them.match_age_max) {
        theirCompatibility.push({
            matched: me.my_age >= them.match_age_min && me.my_age <= them.match_age_max,
            importance: them.match_age_importance
        });
    }

    // Compute total percentage based on both sides' preferences
    let totalPossiblePoints = 0;
    let totalEarnedPoints = 0;

    // My strict preferences vs Their Traits
    compatibility.forEach(c => {
        if (c.preference !== 'Any') {
            const points = c.importance ?? 5;
            totalPossiblePoints += points;
            if (c.matched) totalEarnedPoints += points;
        }
    });

    // Their strict preferences vs My Traits
    const theirPrefList = [them.match_gender, them.match_hair, them.match_eyes, them.match_ethnicity, them.match_religion, 'Age'];
    theirCompatibility.forEach((c, idx) => {
        if (theirPrefList[idx] !== 'Any') {
            const points = c.importance ?? 5;
            totalPossiblePoints += points;
            if (c.matched) totalEarnedPoints += points;
        }
    });

    let percentage = 100;
    if (totalPossiblePoints > 0) {
        percentage = Math.round((totalEarnedPoints / totalPossiblePoints) * 100);
    }

    return { compatibility, percentage };
}
