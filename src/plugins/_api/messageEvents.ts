/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Api required by anything using message events.",
    authors: [Devs.Arjix, Devs.hunt, Devs.Ven],
    patches: [
        {
            find: "#{intl::EDIT_TEXTAREA_HELP}",
            replacement: {
                match: /(?<=,channel:\i,message:\i\}\)\.then\().+?(?=\i\.content!==this\.props\.message\.content&&\i\((.+?)\)\})/,
                replace: (match, args) => "" +
                    `async ${match}` +
                    `if(await Vencord.Api.MessageEvents._handlePreEdit(${args}))` +
                    "return Promise.resolve({shouldClear:false,shouldRefocus:true});"
            }
        },
        {
            find: ".handleSendMessage,onResize:",
            replacement: {
                // the leading optional group grabs Discord's text command handler (+:emoji:, s/find/replace, ...) so it can be re-run when a listener changes the content (#4313)
                match: /(?:let \i=\(0,(\i\.\i)\)\(\i,\{channel:\i,isEdit:!1\}\).+?)?let (\i)=\i\.\i\.parse\((\i),.+?\.getSendMessageOptions\(\{.+?\}\)?;(?=.+?(\i)\.flags=)(?<=\)\(({.+?})\)\.then.+?)/,
                replace: (m, applyTextCommands, parsedMessage, channel, options, props) => m +
                    `const vcOriginalContent=${parsedMessage}.content;` +
                    `if(await Vencord.Api.MessageEvents._handlePreSend(${channel}.id,${parsedMessage},${options},${props}))` +
                    "return{shouldClear:false,shouldRefocus:true};" +
                    (applyTextCommands
                        ? `if(${parsedMessage}.content!==vcOriginalContent){` +
                        `let vcCommandResult=(0,${applyTextCommands})(${parsedMessage}.content,{channel:${channel},isEdit:!1});` +
                        `null!=vcCommandResult&&(null!=vcCommandResult.content&&(${parsedMessage}.content=vcCommandResult.content),null!=vcCommandResult.tts&&(${parsedMessage}.tts=vcCommandResult.tts));` +
                        "}"
                        : "")
            }
        },
        {
            find: '("interactionUsernameProfile',
            replacement: {
                match: /let\{id:\i}=(\i),{id:\i}=(\i);return \i\.useCallback\((\i)=>\{/,
                replace: (m, message, channel, event) =>
                    `const vcMsg=${message},vcChan=${channel};${m}Vencord.Api.MessageEvents._handleClick(vcMsg,vcChan,${event});`
            }
        }
    ]
});
