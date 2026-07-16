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

import { isSettingDisabled } from "@api/PluginManager";
import { Flex } from "@components/Flex";
import { DeleteIcon, PlusIcon } from "@components/Icons";
import { PluginSettingArrayDef } from "@utils/types";
import { Button, React, TextInput, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function ArraySetting({ setting, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginSettingArrayDef>) {
    const [items, setItems] = useState<string[]>(pluginSettings[id] ?? setting.default ?? []);
    const [error, setError] = useState<string | null>(null);

    const disabled = isSettingDisabled(definedSettings, setting);

    function handleChange(newItems: string[]) {
        setItems(newItems);

        for (const item of newItems) {
            const itemValid = setting.validateItem?.(item) ?? true;
            if (itemValid !== true) {
                setError(resolveError(itemValid));
                return;
            }
        }

        const isValid = setting.isValid?.call(definedSettings, newItems) ?? true;
        setError(resolveError(isValid));

        if (isValid === true) {
            onChange(newItems);
        }
    }

    return (
        <SettingsSection name={setting.displayName} id={id} description={setting.description} error={error}>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {items.map((item, index) => (
                    <Flex key={index} flexDirection="row" style={{ gap: "0.5em", alignItems: "center" }}>
                        <div style={{ flexGrow: 1 }}>
                            <TextInput
                                type="text"
                                placeholder={setting.placeholder ?? "Enter a value"}
                                value={item}
                                onChange={v => handleChange(items.with(index, v))}
                                maxLength={null}
                                disabled={disabled}
                                {...setting.componentProps}
                            />
                        </div>
                        <Button
                            size={Button.Sizes.MIN}
                            look={Button.Looks.LINK}
                            color={Button.Colors.TRANSPARENT}
                            onClick={() => handleChange(items.filter((_, i) => i !== index))}
                            disabled={disabled}
                        >
                            <DeleteIcon width={20} height={20} />
                        </Button>
                    </Flex>
                ))}
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => handleChange([...items, ""])}
                    disabled={disabled}
                >
                    <Flex flexDirection="row" style={{ gap: "0.3em", alignItems: "center" }}>
                        <PlusIcon width={16} height={16} /> Add
                    </Flex>
                </Button>
            </Flex>
        </SettingsSection>
    );
}
