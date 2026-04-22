export interface RscPermission {
  name: string;
  displayName: string;
  description: string;
}

export interface RscPermissionGroup {
  Application: RscPermission[];
  Delegated: RscPermission[];
}

export type RscScope = 'Team' | 'Chat' | 'User';
export type RscType = 'Application' | 'Delegated';

export const RSC_PERMISSIONS_TEAM: RscPermissionGroup = {
  Application: [
    {
      name: 'Channel.Create.Group',
      displayName: 'Create channels in this team',
      description: 'Allows the app to create channels in this team, without a signed-in user.',
    },
    {
      name: 'Channel.Delete.Group',
      displayName: "Delete this team's channels",
      description: "Allows the app to delete this team's channels, without a signed-in user.",
    },
    {
      name: 'ChannelMeeting.ReadBasic.Group',
      displayName: 'Read basic properties of the channel meetings in this team',
      description:
        'Allows the app to read basic properties, such as name, schedule, organizer, join link, and start/end notifications, of channel meetings in this team, without a signed-in user.',
    },
    {
      name: 'ChannelMeetingParticipant.Read.Group',
      displayName: "Read the participants of this team's channel meetings",
      description:
        'Allows the app to read participant information, including name, role, id, joined and left times, of channel meetings associated with this team, without a signed-in user.',
    },
    {
      name: 'ChannelMeetingRecording.Read.Group',
      displayName: 'Read the recordings of all channel meetings associated with this team',
      description:
        'Allows the app to read the recordings of all channel meetings associated with this team.',
    },
    {
      name: 'ChannelMeetingTranscript.Read.Group',
      displayName: 'Read the transcripts of all channel meetings associated with this team',
      description:
        'Allows the app to read the transcripts of all channel meetings associated with this team.',
    },
    {
      name: 'ChannelMeetingNotification.Send.Group',
      displayName: 'Send notifications in all the channel meetings associated with this team',
      description:
        'Allows the app to send notifications inside all the channel meetings associated with this team, without a signed-in user.',
    },
    {
      name: 'ChannelMember.Read.Group',
      displayName: "Read the members of this team's channels",
      description: "Allows the app to read the members of this team's channels.",
    },
    {
      name: 'ChannelMember.ReadWrite.Group',
      displayName: "Read and write the members of this team's channels",
      description: "Allows the app to read and write the members of this team's channels.",
    },
    {
      name: 'ChannelMessage.Read.Group',
      displayName: "Read this team's channel messages",
      description:
        "Allows the app to read this team's channel's messages, without a signed-in user.",
    },
    {
      name: 'ChannelMessage.Send.Group',
      displayName: "Send messages to this team's channels",
      description: "Allows the app to send messages to this team's channels.",
    },
    {
      name: 'ChannelSettings.Read.Group',
      displayName: "Read the names, descriptions, and settings of this team's channels",
      description:
        "Allows the app to read this team's channel names, channel descriptions, and channel settings, without a signed-in user.",
    },
    {
      name: 'ChannelSettings.ReadWrite.Group',
      displayName: "Update the names, descriptions, and settings of this team's channels",
      description:
        "Allows the app to update and read the names, descriptions, and settings of this team's channels, without a signed-in user.",
    },
    {
      name: 'Member.Read.Group',
      displayName: "Read the members of this team's channels",
      description: "Allows the app to read the members of this team's channels.",
    },
    {
      name: 'Owner.Read.Group',
      displayName: "Read this group's owners",
      description:
        "Allows the app to read the basic profile of this group's owners, without a signed-in user.",
    },
    {
      name: 'TeamsActivity.Send.Group',
      displayName: 'Send activity feed notifications to users in this team',
      description:
        'Allows the app to create new notifications in the teamwork activity feeds of the users in this team, without a signed-in user.',
    },
    {
      name: 'TeamsAppInstallation.Read.Group',
      displayName: 'Read which apps are installed in this team',
      description:
        'Allows the app read the Teams apps that are installed in this team, without a signed-in user.',
    },
    {
      name: 'TeamMember.Read.Group',
      displayName: "Read this team's members",
      description: 'Allows the app to read the members of this team, without a signed-in user.',
    },
    {
      name: 'TeamSettings.Read.Group',
      displayName: "Read this team's settings",
      description: "Allows the app to read this team's settings, without a signed-in user.",
    },
    {
      name: 'TeamSettings.ReadWrite.Group',
      displayName: "Read and write this team's settings",
      description:
        "Allows the app to read and write this team's settings, without a signed-in user.",
    },
    {
      name: 'TeamsTab.Create.Group',
      displayName: 'Create tabs in this team',
      description: 'Allows the app to create tabs in this team, without a signed-in user.',
    },
    {
      name: 'TeamsTab.Delete.Group',
      displayName: "Delete this team's tabs",
      description: "Allows the app to delete this team's tabs, without a signed-in user.",
    },
    {
      name: 'TeamsTab.Read.Group',
      displayName: "Read this team's tabs",
      description: "Allows the app to read this team's tabs, without a signed-in user.",
    },
    {
      name: 'TeamsTab.ReadWrite.Group',
      displayName: "Manage this team's tabs",
      description: "Allows the app to manage this team's tabs, without a signed-in user.",
    },
  ],
  Delegated: [
    {
      name: 'ChannelMeetingActiveSpeaker.Read.Group',
      displayName: 'Read participants currently sending audio into channel meetings',
      description:
        'Allows the app to read participants who are currently sending audio into the channel meetings associated with this team, on behalf of the signed-in user.',
    },
    {
      name: 'ChannelMeetingAudioVideo.Stream.Group',
      displayName: 'Stream audio-video content of channel meetings associated with this team',
      description:
        'Allows the app to stream audio-video content of channel meetings associated with this team, on behalf of the signed-in user.',
    },
    {
      name: 'ChannelMeetingIncomingAudio.Detect.Group',
      displayName: 'Detect incoming audio in meetings associated with this team',
      description:
        'Allows the app to detect changes in the status of incoming audio in meetings associated with this team, on behalf of the signed-in user.',
    },
    {
      name: 'ChannelMeetingStage.Write.Group',
      displayName:
        'Show content on the meeting stage of channel meetings associated with this team',
      description:
        'Allows the app to show content on the meeting stage in channel meetings associated with this team, on behalf of the signed-in user.',
    },
    {
      name: 'InAppPurchase.Allow.Group',
      displayName: 'Show and complete in-app purchases for users in this team',
      description:
        'Allow the app to show marketplace offers to users in this team and complete their purchases within the app, on behalf of the signed-in user.',
    },
    {
      name: 'LiveShareSession.ReadWrite.Group',
      displayName: 'Create and synchronize Live Share sessions for this team',
      description:
        "Allows the app to create and synchronize Live Share sessions for this team, and access related information about the roster, such as member's role, on behalf of the signed-in user.",
    },
    {
      name: 'MeetingParticipantReaction.Read.Group',
      displayName: 'Read reactions of participants in channel meetings associated with this team',
      description:
        'Allows the app to read reactions of participants in channel meetings associated with this team, on behalf of the signed-in user.',
    },
  ],
};

export const RSC_PERMISSIONS_CHAT: RscPermissionGroup = {
  Application: [
    {
      name: 'Calls.AccessMedia.Chat',
      displayName: 'Access media streams in calls associated with this chat or meeting',
      description:
        'Allows the app to access media streams in calls associated with this chat or meeting, without a signed-in user.',
    },
    {
      name: 'Calls.JoinGroupCalls.Chat',
      displayName: 'Join calls associated with this chat or meeting',
      description:
        'Allows the app to join calls associated with this chat or meeting, without a signed-in user.',
    },
    {
      name: 'ChatSettings.Read.Chat',
      displayName: "Read this chat's settings",
      description: "Allows the app to read this chat's settings, without a signed-in user.",
    },
    {
      name: 'ChatSettings.ReadWrite.Chat',
      displayName: "Read and write this chat's settings",
      description:
        "Allows the app to read and write this chat's settings, without a signed-in user.",
    },
    {
      name: 'ChatMessage.Read.Chat',
      displayName: "Read this chat's messages",
      description: "Allows the app to read this chat's messages, without a signed-in user.",
    },
    {
      name: 'ChatMessage.Send.Chat',
      displayName: 'Send messages to this chat',
      description: 'Allows the app to send messages to this chat.',
    },
    {
      name: 'ChatMessageReadReceipt.Read.Chat',
      displayName: 'Read the ID of the last seen message in this chat',
      description:
        'Allows the app to read the ID of the last message seen by the users in this chat.',
    },
    {
      name: 'ChatMember.Read.Chat',
      displayName: "Read this chat's members",
      description: 'Allows the app to read the members of this chat, without a signed-in user.',
    },
    {
      name: 'Chat.Manage.Chat',
      displayName: 'Manage this chat',
      description:
        "Allows the app to manage the chat, the chat's members and grant access to the chat's data, without a signed-in user.",
    },
    {
      name: 'Chat.ManageDeletion.Chat',
      displayName: 'Delete this chat and recover it',
      description: 'Allows the app to delete the chat and recover it without a signed-in user.',
    },
    {
      name: 'TeamsTab.Read.Chat',
      displayName: "Read this chat's tabs",
      description: "Allows the app to read this chat's tabs, without a signed-in user.",
    },
    {
      name: 'TeamsTab.Create.Chat',
      displayName: 'Create tabs in this chat',
      description: 'Allows the app to create tabs in this chat, without a signed-in user.',
    },
    {
      name: 'TeamsTab.Delete.Chat',
      displayName: "Delete this chat's tabs",
      description: "Allows the app to delete this chat's tabs, without a signed-in user.",
    },
    {
      name: 'TeamsTab.ReadWrite.Chat',
      displayName: "Manage this chat's tabs",
      description: "Allows the app to manage this chat's tabs, without a signed-in user.",
    },
    {
      name: 'TeamsAppInstallation.Read.Chat',
      displayName: 'Read which apps are installed in this chat',
      description:
        'Allows the app read the Teams apps that are installed in this chat along with the permissions granted to each app, without a signed-in user.',
    },
    {
      name: 'TeamsActivity.Send.Chat',
      displayName: 'Send activity feed notifications to users in this chat',
      description:
        'Allows the app to create new notifications in the teamwork activity feeds of the users in this chat, without a signed-in user.',
    },
    {
      name: 'OnlineMeetingTranscript.Read.Chat',
      displayName: 'Read the transcripts of meetings associated with this chat',
      description: 'Allows the app to read the transcripts of meetings associated with this chat.',
    },
    {
      name: 'OnlineMeeting.ReadBasic.Chat',
      displayName: 'Read basic properties of a meeting associated with this chat',
      description:
        'Allows the app to read basic properties, such as name, schedule, organizer, join link, and start/end notifications, of a meeting associated with this chat, without a signed-in user.',
    },
    {
      name: 'OnlineMeetingRecording.Read.Chat',
      displayName: 'Read the recordings of meetings associated with this chat',
      description: 'Allows the app to read the recordings of meetings associated with this chat.',
    },
    {
      name: 'OnlineMeetingNotification.Send.Chat',
      displayName: 'Send notifications in meetings associated with this chat',
      description:
        'Allows the app to send notifications inside meetings associated with this chat, without a signed-in user.',
    },
    {
      name: 'OnlineMeetingParticipant.Read.Chat',
      displayName: 'Read the participants of meetings associated with this chat',
      description:
        'Allows the app to read participant information, including name, role, id, joined and left times, of meetings associated with this chat, without a signed-in user.',
    },
  ],
  Delegated: [
    {
      name: 'InAppPurchase.Allow.Chat',
      displayName: 'Show and complete in-app purchases for users in this chat',
      description:
        'Allow the app to show marketplace offers to the users in this chat, and any associated meeting, and complete their purchases within the app, on behalf of the signed-in user.',
    },
    {
      name: 'LiveShareSession.ReadWrite.Chat',
      displayName: 'Create and synchronize Live Share sessions for this chat',
      description:
        "Allows the app to create and synchronize Live Share sessions for this chat, and access related information about the roster, such as member's role, on behalf of the signed-in user.",
    },
    {
      name: 'MeetingStage.Write.Chat',
      displayName: 'Show content on the meeting stage of meetings associated with this chat',
      description:
        'Allows the app to show content on the meeting stage in meetings associated with this chat, on behalf of the signed-in user.',
    },
    {
      name: 'MeetingParticipantReaction.Read.Chat',
      displayName: 'Read the reactions of participants in meetings associated with this chat',
      description:
        'Allows the app to read the reactions of participants in meetings associated with this chat.',
    },
    {
      name: 'OnlineMeetingIncomingAudio.Detect.Chat',
      displayName: 'Detect incoming audio in meetings associated with this chat',
      description:
        'Allows the app to detect changes in the status of incoming audio in meetings associated with this chat, on behalf of the signed-in user.',
    },
    {
      name: 'OnlineMeetingActiveSpeaker.Read.Chat',
      displayName:
        'Read participants currently sending audio into meetings associated with this chat',
      description:
        'Allows the app to read the participants who are currently sending audio into the meetings associated with this chat.',
    },
    {
      name: 'OnlineMeetingAudioVideo.Stream.Chat',
      displayName: 'Stream audio-video content of meetings associated with this chat',
      description:
        'Allows the app to stream audio-video content of meetings associated with this chat.',
    },
    {
      name: 'OnlineMeetingParticipant.Read.Chat',
      displayName: 'Read the participants of meetings associated with this chat (delegated)',
      description:
        'Allows the app to read participant information, including name, role, id, joined and left times, of meeting associated with this chat, on behalf of the signed-in user.',
    },
    {
      name: 'OnlineMeetingParticipant.ToggleIncomingAudio.Chat',
      displayName: 'Toggle incoming audio for participants in meetings associated with this chat',
      description:
        'Allows the app to toggle incoming audio for participants in meetings associated with this chat, on behalf of the signed-in user.',
    },
  ],
};

export const RSC_PERMISSIONS_USER: RscPermissionGroup = {
  Application: [
    {
      name: 'AiEnterpriseInteraction.Read.User',
      displayName: "Read this user's AI enterprise interactions",
      description: "Allows the app to read the user's AI enterprise interactions.",
    },
    {
      name: 'TeamsActivity.Send.User',
      displayName: 'Send activity notifications to the user',
      description: 'Allows the app to send activity notifications to the user.',
    },
    {
      name: 'TeamsAppInstallation.Read.User',
      displayName: 'Read which apps are installed for this user',
      description:
        'Allows the app to read the Teams apps that are installed for this user along with the permissions granted to each app, without a signed-in user.',
    },
  ],
  Delegated: [
    {
      name: 'CameraStream.Read.User',
      displayName: "Read the user's camera stream",
      description:
        "Allows the app to read the user's camera stream, on behalf of the signed-in user.",
    },
    {
      name: 'InAppPurchase.Allow.User',
      displayName: 'Show and complete in-app purchases',
      description:
        "Allow the app to show the user marketplace offers and complete the user's purchases within the app, on behalf of the signed-in user.",
    },
    {
      name: 'MicrophoneStream.Read.User',
      displayName: "Read the user's microphone stream",
      description: "Allows the app to read the user's microphone stream.",
    },
    {
      name: 'MeetingParticipantReaction.Read.User',
      displayName: "Read the user's reactions while participating in a meeting",
      description: "Allows the app to read the user's reactions while participating in a meeting.",
    },
    {
      name: 'OutgoingVideoStream.Write.User',
      displayName: "Modify the user's outgoing video",
      description:
        "Allows the app to modify the user's outgoing video, on behalf of the signed-in user.",
    },
  ],
};

const SCOPE_CATALOG: Record<RscScope, RscPermissionGroup> = {
  Team: RSC_PERMISSIONS_TEAM,
  Chat: RSC_PERMISSIONS_CHAT,
  User: RSC_PERMISSIONS_USER,
};

const SCOPE_SUFFIXES: Record<string, RscScope> = {
  '.Group': 'Team',
  '.Chat': 'Chat',
  '.User': 'User',
};

export function inferScope(permissionName: string): RscScope | null {
  for (const [suffix, scope] of Object.entries(SCOPE_SUFFIXES)) {
    if (permissionName.endsWith(suffix)) return scope;
  }
  return null;
}

export function findPermission(
  name: string
): (RscPermission & { scope: RscScope; type: RscType }) | null {
  for (const [scope, group] of Object.entries(SCOPE_CATALOG) as [RscScope, RscPermissionGroup][]) {
    for (const type of ['Application', 'Delegated'] as RscType[]) {
      const found = group[type].find((p) => p.name === name);
      if (found) return { ...found, scope, type };
    }
  }
  return null;
}

export function getPermissionsForScope(scope: RscScope): RscPermissionGroup {
  return SCOPE_CATALOG[scope];
}
