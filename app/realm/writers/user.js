// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {PreferenceTypes, UserTypes} from 'app/realm/action_types';
import ephemeralStore from 'app/store/ephemeral_store';
import {userDataToRealm} from 'app/realm/utils/user';

import {mapTeamMembers, removeTeamMemberships, createOrUpdateTeams} from './team';

function resetPreferences(realm, data) {
    if (data.preferences?.length) {
        realm.delete(realm.objects('Preference'));
        data.preferences.forEach((pref) => {
            const id = `${pref.category}-${pref.name}`;
            realm.create('Preference', {...pref, id});
        });
    }
}

function currentUserWriter(realm, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_ME: {
        const data = action.data || action.payload;
        const user = userDataToRealm(data.user);

        let realmUser = realm.objectForPrimaryKey('User', user.id);
        if (!realmUser || user.updateAt !== realmUser.updateAt) {
            realmUser = realm.create('User', user, true);
        }

        realm.create('General', {
            id: General.REALM_SCHEMA_ID,
            currentUserId: user.id,
            deviceToken: ephemeralStore.deviceToken,
        }, true);

        resetPreferences(realm, data);

        const teamMembersMap = mapTeamMembers(data, user);

        // Remove membership from teams
        removeTeamMemberships(realm, user, teamMembersMap);

        createOrUpdateTeams(realm, data, teamMembersMap);
        break;
    }

    case UserTypes.UPDATE_ME: {
        const data = action.data || action.payload;
        const user = userDataToRealm(data);
        realm.create('User', user, true);
        break;
    }

    case PreferenceTypes.RECEIVED_PREFERENCES: {
        const data = action.data || action.payload;
        data.forEach((p) => {
            const preference = {
                id: `${p.category}-${p.name}`,
                ...p,
            };

            realm.create('Preference', preference, true);
        });

        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    currentUserWriter,
]);
