// @flow

/**
 * External dependencies
 */
import memoize from 'fast-memoize';

const _getDynamicValues = (
	{ dynamicValues }: Object,
	group: string
): mixed => {
	return dynamicValues[group].items;
};

export const getDynamicValues: mixed = memoize(_getDynamicValues);

const _getDynamicValue = (
	{ dynamicValues }: Object,
	group: string,
	name: string
): mixed => {
	return Object.values(dynamicValues[group].items).find(
		(i: { ...Object, name: string }): boolean => i.name === name
	);
};

export const getDynamicValue: mixed = memoize(_getDynamicValue);

const _getDynamicValueGroups = ({ dynamicValues }: Object): mixed => {
	return dynamicValues;
};

export const getDynamicValueGroups: mixed = memoize(_getDynamicValueGroups);
