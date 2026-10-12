import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultData } from './data';
import { createRepository } from './repository';

export const repository = createRepository(AsyncStorage, defaultData);
