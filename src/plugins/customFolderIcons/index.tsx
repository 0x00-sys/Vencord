/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 sadan and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { RenderModalProps } from "@vencord/discord-types";
import { Button, Forms, Menu, Modal, openModal, Slider, TextInput, useState } from "@webpack/common";

interface FolderIcon {
    url: string;
    size: number;
}

interface FolderProps {
    folderId: string;
    folderColor: number;
}

const settings = definePluginSettings({
    solidBackground: {
        type: OptionType.BOOLEAN,
        description: "Use a solid background behind custom icons instead of a translucent one",
        default: false
    },
    folderIcons: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, FolderIcon | null>
    }
});

function int2rgba(rgbVal: number, alpha = 1) {
    const b = rgbVal & 0xFF;
    const g = (rgbVal & 0xFF00) >>> 8;
    const r = (rgbVal & 0xFF0000) >>> 16;
    return `rgba(${r},${g},${b},${alpha})`;
}

function IconModal({ rootProps, folderProps }: { rootProps: RenderModalProps; folderProps: FolderProps; }) {
    const current = settings.store.folderIcons[folderProps.folderId];
    const [url, setUrl] = useState(current?.url ?? "");
    const [size, setSize] = useState(current?.size ?? 100);

    function save(icon: FolderIcon | null) {
        settings.store.folderIcons[folderProps.folderId] = icon;
        rootProps.onClose();
    }

    return (
        <Modal {...rootProps} title="Custom Folder Icon">
            <TextInput
                value={url}
                onChange={setUrl}
                placeholder="https://example.com/image.png"
            />
            {url && (
                <>
                    <div
                        className={Margins.top16}
                        style={{
                            width: "128px",
                            height: "128px",
                            overflow: "hidden",
                            borderRadius: "33%",
                            backgroundColor: int2rgba(folderProps.folderColor, settings.store.solidBackground ? 1 : 0.4),
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center"
                        }}
                    >
                        <img alt="" src={url} width={`${size}%`} height={`${size}%`} />
                    </div>
                    <Forms.FormTitle tag="h3" className={Margins.top16}>Icon size</Forms.FormTitle>
                    <Slider
                        initialValue={size}
                        minValue={25}
                        maxValue={200}
                        onValueChange={v => setSize(Math.round(v))}
                        keyboardStep={1}
                    />
                </>
            )}
            <div className={Margins.top16} style={{ display: "flex", gap: "8px" }}>
                <Button disabled={!url} onClick={() => save({ url, size })}>Save</Button>
                <Button color={Button.Colors.RED} onClick={() => save(null)}>Unset</Button>
            </div>
        </Modal>
    );
}

const folderContextMenuPatch: NavContextMenuPatchCallback = (children, props: FolderProps) => {
    if (!("folderId" in props)) return;

    children.push(
        <Menu.MenuItem
            id="vc-custom-folder-icon"
            label="Change Icon"
            action={() => openModal(modalProps => <IconModal rootProps={modalProps} folderProps={props} />)}
        />
    );
};

export default definePlugin({
    name: "CustomFolderIcons",
    description: "Use a custom image as the icon of any server folder, set it by right clicking a folder",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.sadan],
    settings,

    patches: [
        {
            find: "#{intl::GUILD_FOLDER_TOOLTIP_A11Y_LABEL}",
            replacement: {
                match: /(\(0,\i\.jsx\)\(\i,\{folderNode:(\i),hovered:\i,sorting:\i\}\))/,
                replace: "($self.shouldReplace({folderNode:$2})?$self.replace({folderNode:$2}):$1)"
            }
        }
    ],

    shouldReplace(props: { folderNode: { id: string; }; }) {
        return !!settings.store.folderIcons[props.folderNode.id]?.url;
    },

    replace(props: { folderNode: { id: string; color: number; }; }) {
        const icon = settings.store.folderIcons[props.folderNode.id]!;
        return (
            <div
                style={{
                    backgroundColor: int2rgba(props.folderNode.color, settings.store.solidBackground ? 1 : 0.4),
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    height: "100%"
                }}
            >
                <img alt="" src={icon.url} width={`${icon.size}%`} height={`${icon.size}%`} />
            </div>
        );
    },

    contextMenus: {
        "guild-context": folderContextMenuPatch
    }
});
