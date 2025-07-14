import { apiClient } from "@/lib/api-client";
import { CreateTeamRequest, UpdateTeamRequest } from "@/types/team.types";

export default class TeamService {
  static async createTeam(req: CreateTeamRequest) {
    return apiClient.post("teams", req);
  }
  static async updateTeam(req: UpdateTeamRequest) {
    return apiClient.patch("teams", req);
  }
}
