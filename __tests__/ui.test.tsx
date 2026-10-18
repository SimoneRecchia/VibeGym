/**
 * Layout regressions in shared UI components.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Tap } from '../src/ui/Pressable';

describe('Tap', () => {
  it('puts sibling layout on the touch target and the look on its content', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Tap style={{ flex: 1, width: '50%', padding: 5, borderRadius: 8 }}>
          <Text>x</Text>
        </Tap>,
      );
    });
    // Host tree: Pressable's View > animated content View > Text.
    const target = tree.toJSON() as ReactTestRenderer.ReactTestRendererJSON;
    const content = target.children![0] as ReactTestRenderer.ReactTestRendererJSON;
    expect(StyleSheet.flatten(target.props.style)).toEqual({
      flex: 1,
      width: '50%',
    });
    const inner = StyleSheet.flatten(content.props.style);
    expect(inner).toMatchObject({ padding: 5, borderRadius: 8, flexGrow: 1 });
    expect(inner.flex).toBeUndefined();
  });
});
