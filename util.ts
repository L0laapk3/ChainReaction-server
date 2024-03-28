export function split(data: string, separator: string, count: number): string[] {
	let result = data.split(separator, count);
	if (result[count - 1] !== undefined)
		result[count - 1] += data.substring(result.join(separator).length);
	return result;
}